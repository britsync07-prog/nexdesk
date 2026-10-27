CREATE TABLE IF NOT EXISTS ShopTransaction (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  dateStr TEXT NOT NULL,
  enteredBy TEXT NOT NULL,
  enteredByKey TEXT NOT NULL,
  method TEXT NOT NULL,
  partyName TEXT NOT NULL,
  partyKey TEXT NOT NULL,
  productName TEXT,
  productKey TEXT,
  quantityMilli INTEGER,
  unitPricePaisa INTEGER,
  amountPaisa INTEGER NOT NULL,
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ShopTransaction_user_date ON ShopTransaction(userId, dateStr DESC, createdAt DESC);
CREATE INDEX IF NOT EXISTS ShopTransaction_user_party ON ShopTransaction(userId, partyKey, dateStr DESC);
CREATE INDEX IF NOT EXISTS ShopTransaction_user_method ON ShopTransaction(userId, method, dateStr DESC);
CREATE INDEX IF NOT EXISTS ShopTransaction_user_product ON ShopTransaction(userId, productKey);

CREATE TABLE IF NOT EXISTS ShopGoogleSheet (
  userId TEXT PRIMARY KEY,
  spreadsheetId TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
