export interface Env {
  DB: D1Database;
  SESSION_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  APP_ORIGIN: string;
  APP_ORIGINS?: string;
}

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  googleId: string | null;
};
type Row = Record<string, unknown>;
const encoder = new TextEncoder();
const headers = [
  "Record ID",
  "Date",
  "Shift",
  "Supervised By",
  "Factory Name",
  "Location",
  "Persons",
  "Person Names",
  "Remarks",
];
const json = (value: unknown, status = 200, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
const id = () => crypto.randomUUID().replaceAll("-", "");
const b64 = (bytes: Uint8Array | string) =>
  btoa(typeof bytes === "string" ? bytes : String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
const bytes = (value: string) =>
  Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
const cookie = (name: string, value: string, seconds: number) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}; Expires=${new Date(Date.now() + seconds * 1000).toUTCString()}`;

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
}
async function signed(value: string, secret: string) {
  return `${value}.${b64(await hmac(value, secret))}`;
}
async function verify(value: string, secret: string) {
  const [data, sig] = value.split(".");
  return !!data && !!sig && b64(await hmac(data, secret)) === sig ? data : null;
}
function readCookie(request: Request, name: string) {
  return (
    request.headers
      .get("cookie")
      ?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || null
  );
}
async function crypt(value: string, secret: string, decrypt = false) {
  const material = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(secret),
  );
  const key = await crypto.subtle.importKey("raw", material, "AES-GCM", false, [
    decrypt ? "decrypt" : "encrypt",
  ]);
  if (decrypt) {
    const raw = bytes(value);
    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: raw.slice(0, 12) },
        key,
        raw.slice(12),
      ),
    );
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(value),
    ),
  );
  return b64(new Uint8Array([...iv, ...body]));
}
async function currentUser(request: Request, env: Env): Promise<User | null> {
  const raw = readCookie(request, "nexdesk_session");
  if (!raw) return null;
  const payload = await verify(raw, env.SESSION_SECRET);
  if (!payload) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(bytes(payload))) as {
      sub: string;
      exp: number;
    };
    if (session.exp < Date.now()) return null;
    return await env.DB.prepare(
      "SELECT id,email,name,image,googleId FROM User WHERE id=?",
    )
      .bind(session.sub)
      .first<User>();
  } catch {
    return null;
  }
}
async function sessionCookie(userId: string, env: Env) {
  return cookie(
    "nexdesk_session",
    await signed(
      b64(JSON.stringify({ sub: userId, exp: Date.now() + 7776000000 })),
      env.SESSION_SECRET,
    ),
    7776000,
  );
}
const validDate = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const origin = (env: Env, request?: Request) => {
  const requested = request?.headers.get("x-nexdesk-origin")?.replace(/\/$/, "");
  const allowed = [env.APP_ORIGIN, ...(env.APP_ORIGINS || "").split(",")]
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return requested && allowed.includes(requested) ? requested : env.APP_ORIGIN.replace(/\/$/, "");
};
const googleScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

async function oauthStart(request: Request, env: Env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)
    return json({ configured: false, url: null, demoEnabled: false });
  const state = b64(crypto.getRandomValues(new Uint8Array(24)));
  const callback = `${origin(env, request)}/api/auth/google/callback`;
  const query = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callback,
    response_type: "code",
    scope: googleScopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return json(
    {
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${query}`,
      demoEnabled: false,
    },
    200,
    {
      "set-cookie": cookie(
        "nexdesk_oauth",
        await signed(state, env.SESSION_SECRET),
        600,
      ),
    },
  );
}
async function oauthCallback(request: Request, env: Env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const saved = readCookie(request, "nexdesk_oauth");
  const fail = (message: string) =>
    Response.redirect(
      `${origin(env, request)}/login?error=${encodeURIComponent(message)}`,
      302,
    );
  if (
    !code ||
    !state ||
    !saved ||
    (await verify(saved, env.SESSION_SECRET)) !== state
  )
    return fail("Invalid OAuth state. Start sign-in again.");
  const token = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin(env, request)}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!token.ok) return fail("Google sign-in failed. Try again.");
  const tokens = (await token.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!tokens.access_token)
    return fail("Google did not return an access token.");
  const profileResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!profileResponse.ok) return fail("Unable to read your Google profile.");
  const profile = (await profileResponse.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!profile.email) return fail("Google account has no email.");
  let user = await env.DB.prepare(
    "SELECT id,email,name,image,googleId FROM User WHERE email=?",
  )
    .bind(profile.email)
    .first<User>();
  if (!user) {
    user = {
      id: id(),
      email: profile.email,
      name: profile.name || null,
      image: profile.picture || null,
      googleId: profile.id || null,
    };
    await env.DB.prepare(
      "INSERT INTO User (id,email,name,image,googleId,updatedAt) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)",
    )
      .bind(user.id, user.email, user.name, user.image, user.googleId)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE User SET name=?,image=?,googleId=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        profile.name || user.name,
        profile.picture || user.image,
        profile.id || user.googleId,
        user.id,
      )
      .run();
  }
  const access = await crypt(tokens.access_token, env.TOKEN_ENCRYPTION_KEY);
  const refresh = tokens.refresh_token
    ? await crypt(tokens.refresh_token, env.TOKEN_ENCRYPTION_KEY)
    : null;
  const expiry = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  const existing = await env.DB.prepare(
    "SELECT id,refreshToken FROM GoogleIntegration WHERE userId=?",
  )
    .bind(user.id)
    .first<{ id: string; refreshToken: string | null }>();
  if (existing)
    await env.DB.prepare(
      "UPDATE GoogleIntegration SET accessToken=?,refreshToken=?,tokenExpiry=?,scopes=?,syncStatus='idle',updatedAt=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        access,
        refresh || existing.refreshToken,
        expiry,
        tokens.scope || null,
        existing.id,
      )
      .run();
  else
    await env.DB.prepare(
      "INSERT INTO GoogleIntegration (id,userId,accessToken,refreshToken,tokenExpiry,scopes,updatedAt) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)",
    )
      .bind(id(), user.id, access, refresh, expiry, tokens.scope || null)
      .run();
  return new Response(null, {
    status: 302,
    headers: {
      location: `${origin(env, request)}/dashboard?google_connected=true`,
      "set-cookie": await sessionCookie(user.id, env),
    },
  });
}

async function columns(
  request: Request,
  env: Env,
  user: User,
  columnId?: string,
) {
  if (request.method === "GET")
    return json({
      columns: (
        await env.DB.prepare(
          'SELECT * FROM CustomColumn WHERE userId=? AND isDeleted=0 ORDER BY "order" ASC',
        )
          .bind(user.id)
          .all()
      ).results,
    });
  if (columnId && request.method === "DELETE") {
    const changed = await env.DB.prepare(
      "UPDATE CustomColumn SET isDeleted=1,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND userId=?",
    )
      .bind(columnId, user.id)
      .run();
    return changed.meta.changes
      ? json({ success: true })
      : json({ error: "Column not found" }, 404);
  }
  const body = await request.json<Row>();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" ? body.type.toUpperCase() : "TEXT";
  if (
    !name ||
    name.length > 80 ||
    !["TEXT", "NUMBER", "DATE", "SELECT"].includes(type)
  )
    return json({ error: "Invalid column." }, 400);
  let options: string | null = null;
  if (type === "SELECT") {
    const list = Array.isArray(body.options)
      ? body.options.map(String)
      : typeof body.options === "string"
        ? body.options.split(",")
        : [];
    const clean = list.map((x) => x.trim()).filter(Boolean);
    if (clean.length > 50 || clean.some((x) => x.length > 80))
      return json({ error: "Select options are invalid." }, 400);
    options = JSON.stringify(clean);
  }
  if (columnId && request.method === "PUT") {
    const changed = await env.DB.prepare(
      'UPDATE CustomColumn SET name=?,type=?,options=?,required=?,"order"=COALESCE(?,"order"),updatedAt=CURRENT_TIMESTAMP WHERE id=? AND userId=?',
    )
      .bind(
        name,
        type,
        options,
        body.required ? 1 : 0,
        Number.isInteger(body.order) ? body.order : null,
        columnId,
        user.id,
      )
      .run();
    return changed.meta.changes
      ? json({ success: true })
      : json({ error: "Column not found" }, 404);
  }
  const key =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || `custom_${Date.now()}`;
  const count = await env.DB.prepare(
    "SELECT COUNT(*) count FROM CustomColumn WHERE userId=?",
  )
    .bind(user.id)
    .first<{ count: number }>();
  const existing = await env.DB.prepare(
    "SELECT id FROM CustomColumn WHERE userId=? AND key=?",
  )
    .bind(user.id, key)
    .first<{ id: string }>();
  const column = {
    id: existing?.id || id(),
    userId: user.id,
    key,
    name,
    type,
    options,
    required: body.required ? 1 : 0,
    order: count?.count || 0,
  };
  if (existing)
    await env.DB.prepare(
      "UPDATE CustomColumn SET name=?,type=?,options=?,required=?,isDeleted=0,updatedAt=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(name, type, options, column.required, existing.id)
      .run();
  else
    await env.DB.prepare(
      'INSERT INTO CustomColumn (id,userId,key,name,type,options,required,"order",updatedAt) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)',
    )
      .bind(
        column.id,
        column.userId,
        column.key,
        column.name,
        column.type,
        column.options,
        column.required,
        column.order,
      )
      .run();
  return json({ success: true, column }, 201);
}
async function listRecords(request: Request, env: Env, user: User) {
  const url = new URL(request.url);
  const params: unknown[] = [user.id];
  let where = " WHERE userId=?";
  for (const [column, query] of [
    ["dateStr", "date"],
    ["shift", "shift"],
    ["factoryName", "factoryName"],
    ["supervisedBy", "supervisedBy"],
    ["location", "location"],
  ] as const) {
    const value = url.searchParams.get(query);
    if (!value || value === "all") continue;
    where += ` AND ${column} ${column === "dateStr" || column === "shift" ? "=" : "LIKE"} ?`;
    params.push(
      column === "dateStr" || column === "shift" ? value : `%${value}%`,
    );
  }
  if (url.searchParams.get("startDate")) {
    where += " AND dateStr>=?";
    params.push(url.searchParams.get("startDate"));
  }
  if (url.searchParams.get("endDate")) {
    where += " AND dateStr<=?";
    params.push(url.searchParams.get("endDate"));
  }
  if (url.searchParams.get("personName")) {
    where += " AND id IN (SELECT recordId FROM RecordPerson WHERE name LIKE ?)";
    params.push(`%${url.searchParams.get("personName")}%`);
  }
  const requestedLimit = Number.parseInt(
    url.searchParams.get("limit") || "200",
    10,
  );
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 200;
  const requestedOffset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
  const offset = Number.isFinite(requestedOffset)
    ? Math.min(Math.max(requestedOffset, 0), 100000)
    : 0;
  const [summaryResult, recordResult] = await env.DB.batch([
    env.DB.prepare(
      `SELECT COUNT(*) total, SUM(CASE WHEN shift='Day' THEN 1 ELSE 0 END) dayShifts, SUM(CASE WHEN shift='Night' THEN 1 ELSE 0 END) nightShifts, COALESCE(SUM(personsCount),0) personnel FROM ShiftRecord${where}`,
    ).bind(...params),
    env.DB.prepare(
      `SELECT * FROM ShiftRecord${where} ORDER BY dateStr DESC,createdAt DESC LIMIT ? OFFSET ?`,
    ).bind(...params, limit, offset),
  ]);
  const records = recordResult.results as Row[];
  const recordIds = records.map((record) => String(record.id));
  const people = recordIds.length
    ? await env.DB.prepare(
        `SELECT recordId,personIndex,name FROM RecordPerson WHERE recordId IN (${recordIds.map(() => "?").join(",")}) ORDER BY personIndex`,
      )
        .bind(...recordIds)
        .all<Row>()
    : { results: [] as Row[] };
  const byRecord = new Map<string, Row[]>();
  for (const person of people.results) {
    const peopleForRecord = byRecord.get(String(person.recordId)) || [];
    peopleForRecord.push(person);
    byRecord.set(String(person.recordId), peopleForRecord);
  }
  const summary = (summaryResult.results[0] as Row | undefined) || {};
  return json({
    total: Number(summary.total || 0),
    offset,
    limit,
    summary: {
      dayShifts: Number(summary.dayShifts || 0),
      nightShifts: Number(summary.nightShifts || 0),
      personnel: Number(summary.personnel || 0),
    },
    records: records.map((record) => ({
      ...record,
      persons: byRecord.get(String(record.id)) || [],
    })),
  });
}
async function records(
  request: Request,
  env: Env,
  user: User,
  recordId?: string,
  ctx?: ExecutionContext,
) {
  if (request.method === "GET") {
    if (recordId) {
      const record = await env.DB.prepare(
        "SELECT * FROM ShiftRecord WHERE id=? AND userId=?",
      )
        .bind(recordId, user.id)
        .first<Row>();
      if (!record) return json({ error: "Record not found" }, 404);
      const persons = await env.DB.prepare(
        "SELECT personIndex,name FROM RecordPerson WHERE recordId=? ORDER BY personIndex",
      )
        .bind(recordId)
        .all();
      return json({ record: { ...record, persons: persons.results } });
    }
    const u = new URL(request.url);
    const params: unknown[] = [user.id];
    let sql = "SELECT * FROM ShiftRecord WHERE userId=?";
    for (const [c, q] of [
      ["dateStr", "date"],
      ["shift", "shift"],
      ["factoryName", "factoryName"],
      ["supervisedBy", "supervisedBy"],
      ["location", "location"],
    ] as const) {
      const v = u.searchParams.get(q);
      if (v && v !== "all") {
        sql += ` AND ${c} ${c === "dateStr" || c === "shift" ? "=" : "LIKE"} ?`;
        params.push(c === "dateStr" || c === "shift" ? v : `%${v}%`);
      }
    }
    if (u.searchParams.get("startDate")) {
      sql += " AND dateStr>=?";
      params.push(u.searchParams.get("startDate"));
    }
    if (u.searchParams.get("endDate")) {
      sql += " AND dateStr<=?";
      params.push(u.searchParams.get("endDate"));
    }
    if (u.searchParams.get("personName")) {
      sql += " AND id IN (SELECT recordId FROM RecordPerson WHERE name LIKE ?)";
      params.push(`%${u.searchParams.get("personName")}%`);
    }
    sql += " ORDER BY dateStr DESC,createdAt DESC LIMIT 200";
    const result = await env.DB.prepare(sql)
      .bind(...params)
      .all<Row>();
    const items = await Promise.all(
      result.results.map(async (r) => ({
        ...r,
        persons: (
          await env.DB.prepare(
            "SELECT personIndex,name FROM RecordPerson WHERE recordId=? ORDER BY personIndex",
          )
            .bind(r.id)
            .all()
        ).results,
      })),
    );
    return json({ total: items.length, records: items });
  }
  if (request.method === "DELETE" && recordId) {
    await env.DB.prepare("DELETE FROM ShiftRecord WHERE id=? AND userId=?")
      .bind(recordId, user.id)
      .run();
    return json({ success: true });
  }
  const body = await request.json<Row>();
  if (
    !validDate(body.dateStr) ||
    !["Day", "Night"].includes(String(body.shift)) ||
    !["supervisedBy", "factoryName", "location"].every(
      (k) => typeof body[k] === "string" && String(body[k]).trim(),
    )
  )
    return json({ error: "Invalid record fields" }, 400);
  const count = Number(body.personsCount);
  if (!Number.isInteger(count) || count < 1 || count > 20)
    return json(
      { error: "Personnel headcount must be between 1 and 20." },
      400,
    );
  const record = recordId || id();
  const names = Array.isArray(body.personNames)
    ? body.personNames
        .slice(0, count)
        .map(String)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  const values = [
    String(body.dateStr),
    `${body.dateStr}T00:00:00.000Z`,
    String(body.shift),
    String(body.supervisedBy).trim(),
    String(body.factoryName).trim(),
    String(body.location).trim(),
    count,
    body.remarks ? String(body.remarks).trim() : null,
    body.customValues ? JSON.stringify(body.customValues) : null,
  ];
  if (recordId) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM RecordPerson WHERE recordId=?").bind(record),
      env.DB.prepare(
        "UPDATE ShiftRecord SET dateStr=?,date=?,shift=?,supervisedBy=?,factoryName=?,location=?,personsCount=?,remarks=?,customValues=?,syncStatus='pending',updatedAt=CURRENT_TIMESTAMP WHERE id=? AND userId=?",
      ).bind(...values, record, user.id),
    ]);
  } else
    await env.DB.prepare(
      "INSERT INTO ShiftRecord (id,userId,dateStr,date,shift,supervisedBy,factoryName,location,personsCount,remarks,customValues,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
    )
      .bind(record, user.id, ...values)
      .run();
  if (names.length)
    await env.DB.batch(
      names.map((name, index) =>
        env.DB.prepare(
          "INSERT INTO RecordPerson (id,recordId,personIndex,name) VALUES (?,?,?,?)",
        ).bind(id(), record, index + 1, name),
      ),
    );
  ctx?.waitUntil(syncAfterMutation(env, user, record));
  return json({ success: true, record: { id: record } }, recordId ? 200 : 201);
}
async function suggestions(request: Request, env: Env, user: User) {
  const url = new URL(request.url);
  const field = url.searchParams.get("field");
  const query = (
    url.searchParams.get("query") ||
    url.searchParams.get("q") ||
    ""
  ).trim();
  if (
    !field ||
    !["supervisedBy", "factoryName", "location", "personName"].includes(field)
  )
    return json({ error: "Invalid field" }, 400);
  const result =
    field === "personName"
      ? await env.DB.prepare(
          "SELECT DISTINCT rp.name value FROM RecordPerson rp INNER JOIN ShiftRecord sr ON sr.id=rp.recordId WHERE sr.userId=? AND rp.name LIKE ? ORDER BY rp.name LIMIT 10",
        )
          .bind(user.id, `%${query}%`)
          .all<{ value: string }>()
      : await env.DB.prepare(
          `SELECT DISTINCT ${field} value FROM ShiftRecord WHERE userId=? AND ${field} LIKE ? ORDER BY ${field} LIMIT 10`,
        )
          .bind(user.id, `%${query}%`)
          .all<{ value: string }>();
  return json({ suggestions: result.results.map((entry) => entry.value) });
}

const shopMethods = ["credit_purchase", "credit_sale", "cash_sale", "cash_buy", "credit_repay", "credit_collection"] as const;
type ShopMethod = (typeof shopMethods)[number];
type ShopLedgerMethod = ShopMethod | "opening_cash" | "opening_receivable" | "opening_payable";
const shopProductMethods = new Set<ShopMethod>(["credit_purchase", "credit_sale", "cash_sale", "cash_buy"]);
const shopKey = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const shopPaisa = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(result) && result > 0 ? result : null;
};
const shopQuantity = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole) * 1000 + Number((fraction + "000").slice(0, 3));
  return Number.isSafeInteger(result) && result > 0 ? result : null;
};
const shopImpact = (method: ShopLedgerMethod, amountPaisa: number) => ({
  cashPaisa: method === "cash_sale" || method === "credit_collection" || method === "opening_cash" ? amountPaisa : method === "cash_buy" || method === "credit_repay" ? -amountPaisa : 0,
  receivablePaisa: method === "credit_sale" || method === "opening_receivable" ? amountPaisa : method === "credit_collection" ? -amountPaisa : 0,
  payablePaisa: method === "credit_purchase" || method === "opening_payable" ? amountPaisa : method === "credit_repay" ? -amountPaisa : 0,
});
function shopWhere(url: URL, user: User) {
  const params: unknown[] = [user.id];
  let where = " WHERE userId=?";
  for (const [column, query] of [["dateStr", "date"], ["method", "method"], ["partyName", "party"], ["enteredBy", "enteredBy"], ["productName", "product"]] as const) {
    const value = url.searchParams.get(query)?.trim();
    if (!value || value === "all") continue;
    where += column === "dateStr" || column === "method" ? ` AND ${column}=?` : ` AND ${column} LIKE ?`;
    params.push(column === "dateStr" || column === "method" ? value : `%${value}%`);
  }
  if (url.searchParams.get("startDate")) { where += " AND dateStr>=?"; params.push(url.searchParams.get("startDate")); }
  if (url.searchParams.get("endDate")) { where += " AND dateStr<=?"; params.push(url.searchParams.get("endDate")); }
  return { where, params };
}
async function shopBalance(env: Env, user: User, where = " WHERE userId=?", params: unknown[] = [user.id]) {
  const row = await env.DB.prepare(`SELECT
    COALESCE(SUM(CASE WHEN method IN ('cash_sale','credit_collection','opening_cash') THEN amountPaisa WHEN method IN ('cash_buy','credit_repay') THEN -amountPaisa ELSE 0 END),0) cashPaisa,
    COALESCE(SUM(CASE WHEN method IN ('credit_sale','opening_receivable') THEN amountPaisa WHEN method='credit_collection' THEN -amountPaisa ELSE 0 END),0) receivablePaisa,
    COALESCE(SUM(CASE WHEN method IN ('credit_purchase','opening_payable') THEN amountPaisa WHEN method='credit_repay' THEN -amountPaisa ELSE 0 END),0) payablePaisa
    FROM ShopTransaction${where}`).bind(...params).first<Row>();
  return { cashPaisa: Number(row?.cashPaisa || 0), receivablePaisa: Number(row?.receivablePaisa || 0), payablePaisa: Number(row?.payablePaisa || 0) };
}
async function shopSuggestions(request: Request, env: Env, user: User) {
  const url = new URL(request.url);
  const field = url.searchParams.get("field");
  const column = field === "enteredBy" ? "enteredBy" : field === "party" ? "partyName" : field === "product" ? "productName" : null;
  if (!column) return json({ error: "Invalid field" }, 400);
  const query = (url.searchParams.get("query") || "").trim();
  const result = await env.DB.prepare(`SELECT DISTINCT ${column} value FROM ShopTransaction WHERE userId=? AND ${column} IS NOT NULL AND ${column} LIKE ? ORDER BY CASE WHEN ${column} LIKE ? THEN 0 ELSE 1 END, ${column} LIMIT 10`).bind(user.id, `%${query}%`, `${query}%`).all<Row>();
  return json({ suggestions: result.results.map((row) => row.value) });
}
const shopSheetHeaders = ["Transaction ID", "Date", "Entered By", "Method", "Customer / Supplier", "Product", "Quantity", "Unit Price", "Amount", "Note"];
async function ensureShopSheet(env: Env, user: User) {
  const saved = await env.DB.prepare("SELECT spreadsheetId FROM ShopGoogleSheet WHERE userId=?").bind(user.id).first<{ spreadsheetId: string }>();
  if (saved?.spreadsheetId) return saved.spreadsheetId;
  const token = await googleToken(env, user);
  const created = await fetch("https://sheets.googleapis.com/v4/spreadsheets", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ properties: { title: "Shop Ledger Records" }, sheets: [{ properties: { title: "Transactions" } }] }) });
  if (!created.ok) throw new Error("Unable to create the shop spreadsheet.");
  const sheet = await created.json() as { spreadsheetId: string };
  const header = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/Transactions!A1?valueInputOption=USER_ENTERED`, { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ values: [shopSheetHeaders] }) });
  if (!header.ok) throw new Error("Unable to initialize the shop spreadsheet.");
  await env.DB.prepare("INSERT OR REPLACE INTO ShopGoogleSheet (userId,spreadsheetId,updatedAt) VALUES (?,?,CURRENT_TIMESTAMP)").bind(user.id, sheet.spreadsheetId).run();
  return sheet.spreadsheetId;
}
async function syncShopTransaction(env: Env, user: User, transactionId: string) {
  const record = await env.DB.prepare("SELECT * FROM ShopTransaction WHERE id=? AND userId=?").bind(transactionId, user.id).first<Row>();
  if (!record) return;
  const spreadsheetId = await ensureShopSheet(env, user); const token = await googleToken(env, user);
  const row = [record.id, record.dateStr, record.enteredBy, record.method, record.partyName, record.productName || "", record.quantityMilli ? Number(record.quantityMilli) / 1000 : "", record.unitPricePaisa ? Number(record.unitPricePaisa) / 100 : "", Number(record.amountPaisa) / 100, record.note || ""];
  const written = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ values: [row] }) });
  if (!written.ok) throw new Error("Unable to write to the shop spreadsheet.");
}
async function shopOpeningBalances(request: Request, env: Env, user: User) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await request.json<Row>();
  const cash = shopPaisa(body.cash);
  const receivable = shopPaisa(body.receivable);
  const payable = shopPaisa(body.payable);
  const receivablePartyName = String(body.receivablePartyName || body.partyName || "").trim();
  const payablePartyName = String(body.payablePartyName || body.partyName || "").trim();
  if ((!cash && !receivable && !payable) || (receivable && !receivablePartyName) || (payable && !payablePartyName)) return json({ error: "Enter an amount and a customer or supplier where needed" }, 400);
  const dateStr = validDate(body.dateStr) ? String(body.dateStr) : new Date().toISOString().slice(0, 10);
  const entries: [ShopLedgerMethod, number, string][] = [];
  if (cash) entries.push(["opening_cash", cash, "Opening cash"]);
  if (receivable) entries.push(["opening_receivable", receivable, receivablePartyName]);
  if (payable) entries.push(["opening_payable", payable, payablePartyName]);
  await env.DB.batch(entries.map(([method, amountPaisa, party]) => env.DB.prepare("INSERT INTO ShopTransaction (id,userId,dateStr,enteredBy,enteredByKey,method,partyName,partyKey,amountPaisa,note,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").bind(id(), user.id, dateStr, "Opening balance", shopKey("Opening balance"), method, party, shopKey(party), amountPaisa, "Opening balance")));
  const inserted = await env.DB.prepare("SELECT id FROM ShopTransaction WHERE userId=? AND dateStr=? AND enteredBy='Opening balance' ORDER BY createdAt DESC LIMIT ?").bind(user.id, dateStr, entries.length).all<{ id: string }>();
  for (const entry of inserted.results) try { await syncShopTransaction(env, user, entry.id); } catch {}
  return json({ success: true }, 201);
}
async function shopTransactions(request: Request, env: Env, user: User, transactionId?: string) {
  if (request.method === "DELETE" && transactionId) {
    await env.DB.prepare("DELETE FROM ShopTransaction WHERE id=? AND userId=?").bind(transactionId, user.id).run();
    return json({ success: true });
  }
  if (request.method === "POST") {
    const body = await request.json<Row>();
    const method = String(body.method || "") as ShopMethod;
    const enteredBy = String(body.enteredBy || "").trim();
    const partyName = String(body.partyName || "").trim();
    if (!validDate(body.dateStr) || !shopMethods.includes(method) || !enteredBy || !partyName) return json({ error: "Invalid transaction fields" }, 400);
    let amountPaisa: number | null;
    let quantityMilli: number | null = null;
    let unitPricePaisa: number | null = null;
    let productName: string | null = null;
    if (shopProductMethods.has(method)) {
      productName = String(body.productName || "").trim();
      quantityMilli = shopQuantity(body.quantity);
      unitPricePaisa = shopPaisa(body.unitPrice);
      amountPaisa = quantityMilli && unitPricePaisa ? Math.round((quantityMilli * unitPricePaisa) / 1000) : null;
      if (!productName || !amountPaisa) return json({ error: "Product, quantity, and unit price are required" }, 400);
    } else {
      amountPaisa = shopPaisa(body.amount);
      if (!amountPaisa) return json({ error: "A valid amount is required" }, 400);
      const partyBalance = await shopBalance(env, user, " WHERE userId=? AND partyKey=?", [user.id, shopKey(partyName)]);
      if (method === "credit_collection" && amountPaisa > partyBalance.receivablePaisa) return json({ error: "Collection cannot exceed this person's due amount" }, 400);
      if (method === "credit_repay" && amountPaisa > partyBalance.payablePaisa) return json({ error: "Repayment cannot exceed the amount you owe this person" }, 400);
    }
    const transaction = { id: id(), dateStr: String(body.dateStr), enteredBy, method, partyName, productName, quantityMilli, unitPricePaisa, amountPaisa, note: String(body.note || "").trim() || null };
    await env.DB.prepare("INSERT INTO ShopTransaction (id,userId,dateStr,enteredBy,enteredByKey,method,partyName,partyKey,productName,productKey,quantityMilli,unitPricePaisa,amountPaisa,note,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").bind(transaction.id, user.id, transaction.dateStr, enteredBy, shopKey(enteredBy), method, partyName, shopKey(partyName), productName, productName ? shopKey(productName) : null, quantityMilli, unitPricePaisa, amountPaisa, transaction.note).run();
    try { await syncShopTransaction(env, user, transaction.id); } catch {}
    return json({ success: true, transaction: { ...transaction, ...shopImpact(method, amountPaisa) } }, 201);
  }
  if (transactionId) {
    const transaction = await env.DB.prepare("SELECT * FROM ShopTransaction WHERE id=? AND userId=?").bind(transactionId, user.id).first<Row>();
    return transaction ? json({ transaction: { ...transaction, ...shopImpact(String(transaction.method) as ShopMethod, Number(transaction.amountPaisa)) } }) : json({ error: "Not found" }, 404);
  }
  const url = new URL(request.url);
  const { where, params } = shopWhere(url, user);
  const maximum = url.searchParams.get("export") === "pdf" ? 5000 : 100;
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), maximum);
  const offset = Math.max(Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);
  const [count, rows, filtered] = await env.DB.batch([
    env.DB.prepare(`SELECT COUNT(*) total FROM ShopTransaction${where}`).bind(...params),
    env.DB.prepare(`SELECT * FROM ShopTransaction${where} ORDER BY dateStr DESC,createdAt DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset),
    env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN method IN ('cash_sale','credit_collection','opening_cash') THEN amountPaisa WHEN method IN ('cash_buy','credit_repay') THEN -amountPaisa ELSE 0 END),0) cashPaisa, COALESCE(SUM(CASE WHEN method IN ('credit_sale','opening_receivable') THEN amountPaisa WHEN method='credit_collection' THEN -amountPaisa ELSE 0 END),0) receivablePaisa, COALESCE(SUM(CASE WHEN method IN ('credit_purchase','opening_payable') THEN amountPaisa WHEN method='credit_repay' THEN -amountPaisa ELSE 0 END),0) payablePaisa FROM ShopTransaction${where}`).bind(...params),
  ]);
  const globalBalance = await shopBalance(env, user);
  const filterBalance = filtered.results[0] as Row | undefined;
  return json({ total: Number((count.results[0] as Row | undefined)?.total || 0), limit, offset, balance: globalBalance, filterBalance: { cashPaisa: Number(filterBalance?.cashPaisa || 0), receivablePaisa: Number(filterBalance?.receivablePaisa || 0), payablePaisa: Number(filterBalance?.payablePaisa || 0) }, transactions: (rows.results as Row[]).map((row) => ({ ...row, ...shopImpact(String(row.method) as ShopMethod, Number(row.amountPaisa)) })) });
}
async function shopContacts(request: Request, env: Env, user: User, partyKey?: string) {
  const url = new URL(request.url);
  if (partyKey) {
    const key = shopKey(decodeURIComponent(partyKey));
    const transactions = await env.DB.prepare("SELECT * FROM ShopTransaction WHERE userId=? AND partyKey=? ORDER BY dateStr DESC,createdAt DESC").bind(user.id, key).all<Row>();
    if (!transactions.results.length) return json({ error: "Not found" }, 404);
    const balance = await shopBalance(env, user, " WHERE userId=? AND partyKey=?", [user.id, key]);
    return json({ partyName: transactions.results[0].partyName, balance, transactions: transactions.results.map((row) => ({ ...row, ...shopImpact(String(row.method) as ShopMethod, Number(row.amountPaisa)) })) });
  }
  const query = (url.searchParams.get("query") || "").trim();
  const rows = await env.DB.prepare(`SELECT partyName,partyKey,
    COALESCE(SUM(CASE WHEN method IN ('credit_sale','opening_receivable') THEN amountPaisa WHEN method='credit_collection' THEN -amountPaisa ELSE 0 END),0) receivablePaisa,
    COALESCE(SUM(CASE WHEN method IN ('credit_purchase','opening_payable') THEN amountPaisa WHEN method='credit_repay' THEN -amountPaisa ELSE 0 END),0) payablePaisa
    FROM ShopTransaction WHERE userId=? AND partyName LIKE ? AND method<>'opening_cash' GROUP BY partyKey,partyName ORDER BY partyName LIMIT 100`).bind(user.id, `%${query}%`).all<Row>();
  return json({ contacts: rows.results });
}
async function syncInfo(env: Env, user: User) {
  const integration = await env.DB.prepare(
    "SELECT * FROM GoogleIntegration WHERE userId=?",
  )
    .bind(user.id)
    .first<Row>();
  const [pending, failed, logs] = await env.DB.batch([
    env.DB.prepare(
      "SELECT COUNT(*) count FROM ShiftRecord WHERE userId=? AND syncStatus='pending'",
    ).bind(user.id),
    env.DB.prepare(
      "SELECT COUNT(*) count FROM ShiftRecord WHERE userId=? AND syncStatus='failed'",
    ).bind(user.id),
    env.DB.prepare(
      "SELECT * FROM SyncAuditLog WHERE userId=? ORDER BY createdAt DESC LIMIT 10",
    ).bind(user.id),
  ]);
  return json({
    connected: !!integration?.refreshToken,
    spreadsheetId: integration?.spreadsheetId || null,
    spreadsheetName: integration?.spreadsheetName || "ShiftLog Records",
    sheetTabName: integration?.sheetTabName || "Records",
    syncStatus: integration?.syncStatus || "idle",
    lastSyncAt: integration?.lastSyncAt || null,
    lastError: integration?.lastError || null,
    pendingRecordsCount: (pending.results[0] as Row)?.count || 0,
    failedRecordsCount: (failed.results[0] as Row)?.count || 0,
    auditLogs: logs.results,
  });
}
async function googleToken(env: Env, user: User) {
  const integration = await env.DB.prepare(
    "SELECT * FROM GoogleIntegration WHERE userId=?",
  )
    .bind(user.id)
    .first<{
      id: string;
      accessToken: string | null;
      refreshToken: string | null;
      tokenExpiry: string | null;
    }>();
  if (!integration?.refreshToken)
    throw new Error("Google integration not connected.");
  let access = integration.accessToken
    ? await crypt(integration.accessToken, env.TOKEN_ENCRYPTION_KEY, true)
    : "";
  if (
    !access ||
    !integration.tokenExpiry ||
    Date.parse(integration.tokenExpiry) < Date.now() + 60000
  ) {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: await crypt(
          integration.refreshToken,
          env.TOKEN_ENCRYPTION_KEY,
          true,
        ),
        grant_type: "refresh_token",
      }),
    });
    if (!r.ok) throw new Error("Google token refresh failed.");
    const t = (await r.json()) as { access_token: string; expires_in: number };
    access = t.access_token;
    await env.DB.prepare(
      "UPDATE GoogleIntegration SET accessToken=?,tokenExpiry=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(
        await crypt(access, env.TOKEN_ENCRYPTION_KEY),
        new Date(Date.now() + t.expires_in * 1000).toISOString(),
        integration.id,
      )
      .run();
  }
  return access;
}
async function audit(
  env: Env,
  userId: string,
  operation: string,
  status: string,
  details: string,
) {
  await env.DB.prepare(
    "INSERT INTO SyncAuditLog (id,userId,operation,status,details) VALUES (?,?,?,?,?)",
  )
    .bind(id(), userId, operation, status, details.slice(0, 1000))
    .run();
}
async function ensureSpreadsheet(env: Env, user: User) {
  const integration = await env.DB.prepare(
    "SELECT spreadsheetId FROM GoogleIntegration WHERE userId=?",
  )
    .bind(user.id)
    .first<{ spreadsheetId: string | null }>();
  if (integration?.spreadsheetId) return integration.spreadsheetId;
  const token = await googleToken(env, user),
    title = "ShiftLog Records";
  const found = await fetch(
    `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q: `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`, fields: "files(id,name)" })}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!found.ok)
    throw new Error(
      "Unable to search Google Drive for the designated spreadsheet.",
    );
  const files =
    ((await found.json()) as { files?: { id: string; name: string }[] })
      .files || [];
  if (files.length > 1)
    throw new Error(
      "Multiple ShiftLog Records spreadsheets found. Choose one in Settings.",
    );
  if (files.length === 1) {
    await env.DB.prepare(
      "UPDATE GoogleIntegration SET spreadsheetId=?,spreadsheetName=?,sheetTabName='Records',syncStatus='idle',updatedAt=CURRENT_TIMESTAMP WHERE userId=?",
    )
      .bind(files[0].id, files[0].name, user.id)
      .run();
    return files[0].id;
  }
  const columns = await env.DB.prepare(
    'SELECT name FROM CustomColumn WHERE userId=? AND isDeleted=0 ORDER BY "order"',
  )
    .bind(user.id)
    .all<{ name: string }>();
  const created = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: "Records" } }],
    }),
  });
  if (!created.ok) throw new Error("Google Sheets creation failed.");
  const sheet = (await created.json()) as { spreadsheetId: string };
  const headerWrite = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/Records!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        values: [[...headers, ...columns.results.map((column) => column.name)]],
      }),
    },
  );
  if (!headerWrite.ok) throw new Error("Unable to initialize the Records tab.");
  await env.DB.prepare(
    "UPDATE GoogleIntegration SET spreadsheetId=?,spreadsheetName=?,sheetTabName='Records',syncStatus='idle',lastError=NULL,updatedAt=CURRENT_TIMESTAMP WHERE userId=?",
  )
    .bind(sheet.spreadsheetId, title, user.id)
    .run();
  return sheet.spreadsheetId;
}
async function syncAfterMutation(env: Env, user: User, recordId: string) {
  try {
    await syncRecord(env, user, recordId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE ShiftRecord SET syncStatus='failed',syncError=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?",
      ).bind(message, recordId),
      env.DB.prepare(
        "UPDATE GoogleIntegration SET syncStatus='error',lastError=?,updatedAt=CURRENT_TIMESTAMP WHERE userId=?",
      ).bind(message, user.id),
    ]);
  }
}
async function syncRecord(env: Env, user: User, recordId: string) {
  await ensureSpreadsheet(env, user);
  const integration = await env.DB.prepare(
    "SELECT spreadsheetId,sheetTabName FROM GoogleIntegration WHERE userId=?",
  )
    .bind(user.id)
    .first<{ spreadsheetId: string | null; sheetTabName: string | null }>();
  if (!integration?.spreadsheetId) throw new Error("No spreadsheet connected.");
  const token = await googleToken(env, user),
    tab = integration.sheetTabName || "Records",
    range = encodeURIComponent(`${tab}!`),
    auth = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };
  const record = await env.DB.prepare(
    "SELECT * FROM ShiftRecord WHERE id=? AND userId=?",
  )
    .bind(recordId, user.id)
    .first<Row>();
  if (!record) throw new Error("Record not found.");
  const [people, columns] = await env.DB.batch([
    env.DB.prepare(
      "SELECT name FROM RecordPerson WHERE recordId=? ORDER BY personIndex",
    ).bind(recordId),
    env.DB.prepare(
      'SELECT key,name FROM CustomColumn WHERE userId=? AND isDeleted=0 ORDER BY "order"',
    ).bind(user.id),
  ]);
  const wanted = [
    ...headers,
    ...columns.results.map((c: Row) => String(c.name)),
  ];
  const headerResult = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${integration.spreadsheetId}/values/${range}1:1`,
    { headers: auth },
  );
  const body = (await headerResult.json()) as { values?: string[][] };
  let current = body.values?.[0] || [];
  if (!current.length || wanted.some((h) => !current.includes(h))) {
    current = [...new Set([...current, ...wanted])];
    const put = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${integration.spreadsheetId}/values/${range}A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: auth,
        body: JSON.stringify({ values: [current] }),
      },
    );
    if (!put.ok) throw new Error("Unable to write sheet headers.");
  }
  let custom: Record<string, string> = {};
  try {
    custom = record.customValues ? JSON.parse(String(record.customValues)) : {};
  } catch {
    /* malformed historic data remains empty */
  }
  const values: Record<string, string> = {
    "Record ID": String(record.id),
    Date: String(record.dateStr),
    Shift: String(record.shift),
    "Supervised By": String(record.supervisedBy),
    "Factory Name": String(record.factoryName),
    Location: String(record.location),
    Persons: String(record.personsCount),
    "Person Names": people.results.map((p: Row) => String(p.name)).join(", "),
    Remarks: String(record.remarks || ""),
  };
  for (const col of columns.results as Row[])
    values[String(col.name)] = custom[String(col.key)] || "";
  const row = current.map((h) => values[h] || "");
  const idResult = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${integration.spreadsheetId}/values/${range}A:A`,
    { headers: auth },
  );
  const ids = ((await idResult.json()) as { values?: string[][] }).values || [];
  const index = ids.findIndex((r, i) => i > 0 && r[0] === record.id);
  const write =
    index > 0
      ? await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${integration.spreadsheetId}/values/${range}A${index + 1}?valueInputOption=USER_ENTERED`,
          {
            method: "PUT",
            headers: auth,
            body: JSON.stringify({ values: [row] }),
          },
        )
      : await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${integration.spreadsheetId}/values/${range}A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            method: "POST",
            headers: auth,
            body: JSON.stringify({ values: [row] }),
          },
        );
  if (!write.ok) throw new Error("Unable to write record to Google Sheets.");
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE ShiftRecord SET syncStatus='synced',lastSyncedAt=CURRENT_TIMESTAMP,syncError=NULL,updatedAt=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(recordId),
    env.DB.prepare(
      "UPDATE GoogleIntegration SET syncStatus='synced',lastSyncAt=CURRENT_TIMESTAMP,lastError=NULL,updatedAt=CURRENT_TIMESTAMP WHERE userId=?",
    ).bind(user.id),
  ]);
}
async function syncAll(env: Env, user: User) {
  const rows = await env.DB.prepare(
    "SELECT id FROM ShiftRecord WHERE userId=? AND syncStatus IN ('pending','failed') ORDER BY dateStr LIMIT 50",
  )
    .bind(user.id)
    .all<{ id: string }>();
  let synced = 0,
    failed = 0;
  for (const r of rows.results)
    try {
      await syncRecord(env, user, r.id);
      synced++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Sync failed";
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE ShiftRecord SET syncStatus='failed',syncError=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?",
        ).bind(message, r.id),
        env.DB.prepare(
          "UPDATE GoogleIntegration SET syncStatus='error',lastError=?,updatedAt=CURRENT_TIMESTAMP WHERE userId=?",
        ).bind(message, user.id),
      ]);
    }
  await audit(
    env,
    user.id,
    "SYNC_RECORD",
    failed ? "WARNING" : "SUCCESS",
    `Synced ${synced}; failed ${failed}`,
  );
  return {
    totalAttempted: rows.results.length,
    syncedCount: synced,
    failedCount: failed,
  };
}
async function importSheet(env: Env, user: User) {
  const integration = await env.DB.prepare(
    "SELECT spreadsheetId,sheetTabName FROM GoogleIntegration WHERE userId=?",
  )
    .bind(user.id)
    .first<{ spreadsheetId: string | null; sheetTabName: string | null }>();
  if (!integration?.spreadsheetId) throw new Error("No spreadsheet connected.");
  const token = await googleToken(env, user),
    range = encodeURIComponent(`${integration.sheetTabName || "Records"}!A:ZZ`),
    reply = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${integration.spreadsheetId}/values/${range}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
  if (!reply.ok) throw new Error("Unable to read Google Sheet.");
  const rows = ((await reply.json()) as { values?: string[][] }).values || [];
  if (rows.length < 2) return { importedCount: 0 };
  const index = Object.fromEntries(
    rows[0].map((h, i) => [h.trim().toLowerCase(), i]),
  );
  let imported = 0;
  for (const row of rows.slice(1)) {
    const get = (name: string) => String(row[index[name]] || "").trim(),
      date = get("date"),
      shift = get("shift").toLowerCase().includes("night") ? "Night" : "Day",
      factory = get("factory name") || "Factory",
      supervisor = get("supervised by") || "Supervisor";
    if (!validDate(date)) continue;
    const existing = await env.DB.prepare(
      "SELECT id FROM ShiftRecord WHERE userId=? AND ((id=? AND ?<>'') OR (dateStr=? AND shift=? AND factoryName=? AND supervisedBy=?)) LIMIT 1",
    )
      .bind(
        user.id,
        get("record id"),
        get("record id"),
        date,
        shift,
        factory,
        supervisor,
      )
      .first();
    if (existing) continue;
    const recordId = get("record id") || id(),
      names = get("person names")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      count = Math.min(
        20,
        Math.max(1, Number.parseInt(get("persons"), 10) || names.length || 1),
      );
    await env.DB.prepare(
      "INSERT INTO ShiftRecord (id,userId,dateStr,date,shift,supervisedBy,factoryName,location,personsCount,remarks,syncStatus,lastSyncedAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?, 'synced',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",
    )
      .bind(
        recordId,
        user.id,
        date,
        `${date}T00:00:00.000Z`,
        shift,
        supervisor,
        factory,
        get("location") || "Location",
        count,
        get("remarks") || null,
      )
      .run();
    if (names.length)
      await env.DB.batch(
        names
          .slice(0, 20)
          .map((name, i) =>
            env.DB.prepare(
              "INSERT INTO RecordPerson (id,recordId,personIndex,name) VALUES (?,?,?,?)",
            ).bind(id(), recordId, i + 1, name),
          ),
      );
    imported++;
  }
  await audit(
    env,
    user.id,
    "IMPORT",
    "SUCCESS",
    `Imported ${imported} records from Google Sheets`,
  );
  return { importedCount: imported };
}
async function sync(request: Request, env: Env, user: User) {
  if (request.method === "GET") return syncInfo(env, user);
  const body = await request.json<Row>();
  const action = body.action;
  if (action === "create_sheet") {
    const spreadsheetId = await ensureSpreadsheet(env, user);
    return json({ success: true, spreadsheetId, name: "ShiftLog Records", webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}` });
  }
  if (action === "discover") {
    const token = await googleToken(env, user);
    const title = String(body.title || "ShiftLog Records").replaceAll(
      "'",
      "\\'",
    );
    const r = await fetch(
      `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q: `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`, fields: "files(id,name,webViewLink,createdTime,modifiedTime)" })}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    return json({
      files: ((await r.json()) as { files?: unknown[] }).files || [],
    });
  }
  if (action === "connect_existing") {
    if (!body.spreadsheetId)
      return json({ error: "Spreadsheet ID is required" }, 400);
    await env.DB.prepare(
      "UPDATE GoogleIntegration SET spreadsheetId=?,spreadsheetName=?,syncStatus='idle',updatedAt=CURRENT_TIMESTAMP WHERE userId=?",
    )
      .bind(
        String(body.spreadsheetId),
        String(body.name || "Connected Spreadsheet"),
        user.id,
      )
      .run();
    return json({ success: true });
  }
  if (action === "sync_all")
    return json({ success: true, ...(await syncAll(env, user)) });
  if (action === "import_sheet")
    return json({ success: true, ...(await importSheet(env, user)) });
  return json({ error: "Unknown action" }, 400);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": request.headers.get("origin") || "",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "content-type",
        },
      });
    if (url.pathname === "/api/health") return json({ status: "ok" });
    if (url.pathname === "/api/auth/google/url") return oauthStart(request, env);
    if (url.pathname === "/api/auth/google/callback")
      return oauthCallback(request, env);
    const user = await currentUser(request, env);
    if (url.pathname === "/api/auth/session") return json({ user });
    if (url.pathname === "/api/auth/logout" && request.method === "POST")
      return json({ success: true }, 200, {
        "set-cookie": cookie("nexdesk_session", "", 0),
      });
    if (!user) return json({ error: "Unauthorized" }, 401);
    const shopTransaction = url.pathname.match(/^\/api\/shop\/transactions(?:\/([^/]+))?$/);
    const shopContact = url.pathname.match(/^\/api\/shop\/contacts(?:\/([^/]+))?$/);
    if (url.pathname === "/api/shop/suggestions") return shopSuggestions(request, env, user);
    if (url.pathname === "/api/shop/opening-balances") return shopOpeningBalances(request, env, user);
    if (shopTransaction) return shopTransactions(request, env, user, shopTransaction[1]);
    if (shopContact && request.method === "GET") return shopContacts(request, env, user, shopContact[1]);
    const record = url.pathname.match(/^\/api\/records(?:\/([^/]+))?$/);
    const column = url.pathname.match(/^\/api\/custom-columns(?:\/([^/]+))?$/);
    if (record && !record[1] && request.method === "GET")
      return listRecords(request, env, user);
    if (record) return records(request, env, user, record[1], ctx);
    if (column) return columns(request, env, user, column[1]);
    if (url.pathname === "/api/suggestions")
      return suggestions(request, env, user);
    if (url.pathname === "/api/sync") return sync(request, env, user);
    return json({ error: "Not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
