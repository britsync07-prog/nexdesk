import os
import sys
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw total page numbers and running headers/footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Skip running header on cover page
        if self._pageNumber > 1:
            # Header
            self.drawString(54, 800, "NexDesk — Project Architecture & PDF Making Documentation")
            self.drawRightString(A4[0] - 54, 800, "CONFIDENTIAL / INTERNAL")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 794, A4[0] - 54, 794)

            # Footer
            self.line(54, 45, A4[0] - 54, 45)
            self.drawString(54, 32, "NexDesk Shift Management System")
            self.drawRightString(
                A4[0] - 54,
                32,
                f"Page {self._pageNumber} of {page_count}"
            )
        self.restoreState()


def create_project_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0f172a")    # Slate 900
    brand_blue = colors.HexColor("#1e40af")       # Blue 800
    text_dark = colors.HexColor("#1e293b")        # Slate 800
    text_muted = colors.HexColor("#64748b")       # Slate 500
    border_color = colors.HexColor("#cbd5e1")     # Slate 300
    bg_light = colors.HexColor("#f8fafc")         # Slate 50
    bg_code = colors.HexColor("#f1f5f9")          # Slate 100

    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=28,
        leading=34,
        textColor=primary_color,
        spaceAfter=10,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=brand_blue,
        spaceAfter=25,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=22,
        textColor=primary_color,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=brand_blue,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14.5,
        textColor=text_dark,
        spaceAfter=7,
    )

    body_bold = ParagraphStyle(
        "Body_Bold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.2,
        leading=13.8,
        textColor=text_dark,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4,
    )

    code_style = ParagraphStyle(
        "Code_Custom",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#0f172a"),
        backColor=bg_code,
        borderPadding=6,
        spaceAfter=8,
    )

    badge_style = ParagraphStyle(
        "Badge_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e3a8a"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11,
        textColor=text_dark,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.2,
        leading=11,
        textColor=text_dark,
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 40))
    story.append(Paragraph("NexDesk System Architecture & PDF Engine", title_style))
    story.append(Paragraph("A Comprehensive Technical Reference & Implementation Report", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=brand_blue, spaceBefore=0, spaceAfter=20))

    meta_table_data = [
        [Paragraph("<b>Project:</b>", body_style), Paragraph("NexDesk (Factory Shift Management System)", body_style)],
        [Paragraph("<b>Core Technology:</b>", body_style), Paragraph("Next.js 16 + Cloudflare Pages & Workers + Cloudflare D1 + Google APIs", body_style)],
        [Paragraph("<b>PDF Subsystem:</b>", body_style), Paragraph("jsPDF + AutoTable (Client-side low-ink tabular report generator)", body_style)],
        [Paragraph("<b>Generated On:</b>", body_style), Paragraph(datetime.now().strftime("%B %d, %Y - %H:%M"), body_style)],
        [Paragraph("<b>Document Scope:</b>", body_style), Paragraph("Full System Blueprint, Database Schemas, Workflows & PDF Deep-Dive", body_style)],
    ]
    meta_table = Table(meta_table_data, colWidths=[110, 377])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_light),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, border_color),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 25))

    # Executive Summary Card
    exec_summary_text = (
        "<b>Executive Summary:</b> NexDesk is an enterprise-grade factory shift logging and workforce tracking "
        "application engineered for fast operational logging by factory supervisors and robust historical audit "
        "by management. Running as a statically exported Next.js 16 application on Cloudflare Pages, backed by "
        "Pages Functions, a dedicated Cloudflare Worker, and Cloudflare D1 (serverless SQLite), NexDesk achieves "
        "sub-100ms global response times with zero cold starts. It synchronizes asynchronously to Google Sheets "
        "as a redundant audit log without blocking user transactions, and features an integrated high-density "
        "PDF generation engine designed specifically for factory floor shift logs."
    )
    exec_table = Table([[Paragraph(exec_summary_text, body_style)]], colWidths=[487])
    exec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
        ("BORDER", (0, 0), (-1, -1), 1, colors.HexColor("#bfdbfe")),
        ("PADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(exec_table)

    story.append(Spacer(1, 30))
    story.append(Paragraph("<b>Contents Overview:</b>", body_bold))
    toc_items = [
        "1. Project Overview & Business Requirements",
        "2. Complete Architectural Topology & Edge Cloudflare Stack",
        "3. Database Design, Relational Models & D1 SQLite Schemas",
        "4. Application Features & Operational Workflows",
        "5. Deep-Dive: PDF Generation & Export Architecture (src/lib/pdf.ts)",
        "6. Engineering Decisions, Incident Fixes & Production Hardening",
        "7. Setup, Deployment, Security & Maintenance Guide",
    ]
    for item in toc_items:
        story.append(Paragraph(f"• &nbsp; {item}", bullet_style))

    story.append(PageBreak())

    # ==================== SECTION 1: PROJECT OVERVIEW ====================
    story.append(Paragraph("1. Project Overview & Business Requirements", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_blue, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "Industrial factory operations require accurate, accountable, and tamper-evident tracking of production shifts. "
        "Before NexDesk, supervisors often relied on fragmented paper logs, chat messages, or fragile shared spreadsheets "
        "which frequently suffered from concurrency conflicts, sluggish network lookups, and accidental data overwrites.",
        body_style
    ))
    story.append(Paragraph(
        "<b>NexDesk</b> solves these challenges by establishing clear boundaries between operational data capture, "
        "live relational querying, long-term cloud spreadsheet replication, and offline paper reporting:",
        body_style
    ))

    story.append(Paragraph("• <b>Speed & Usability:</b> Mobile-first, responsive interface allowing supervisors on the factory floor to record day or night shifts in seconds.", bullet_style))
    story.append(Paragraph("• <b>Smart Suggestions:</b> Per-user cached suggestions for worker names, supervisors, factories, and locations to minimize typing errors.", bullet_style))
    story.append(Paragraph("• <b>Reliable Querying:</b> Cloudflare D1 serves as the single source of truth with SQL indexing, providing instantaneous filtering across thousands of records.", bullet_style))
    story.append(Paragraph("• <b>Asynchronous Spreadsheet Sync:</b> Background syncing to user-owned Google Sheets ensures executive reporting without dragging down operational performance.", bullet_style))
    story.append(Paragraph("• <b>Deterministic PDF Export:</b> Client-side vector PDF generation enabling offline printing and signed paper sign-offs directly from filtered views.", bullet_style))

    story.append(Spacer(1, 10))

    # ==================== SECTION 2: ARCHITECTURE & TOPOLOGY ====================
    story.append(Paragraph("2. Complete Architectural Topology", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_blue, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "NexDesk adopts an edge-first distributed architecture running entirely on the Cloudflare global network. "
        "The architecture is decoupled into distinct presentation, proxy, compute, and persistence layers:",
        body_style
    ))

    arch_table_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Component", table_header_style), Paragraph("Role & Responsibility", table_header_style)],
        [
            Paragraph("Presentation", table_cell_bold),
            Paragraph("Cloudflare Pages<br/>(Next.js 16 Export)", table_cell_style),
            Paragraph("Statically generated HTML/CSS/JS bundles delivered instantly via Cloudflare CDN edge nodes with zero compute overhead.", table_cell_style)
        ],
        [
            Paragraph("API Proxy", table_cell_bold),
            Paragraph("Pages Functions<br/>(functions/api/[[path]].ts)", table_cell_style),
            Paragraph("Same-origin reverse proxy forwarding all /api/* calls to the Cloudflare Worker while preserving auth cookies and request headers.", table_cell_style)
        ],
        [
            Paragraph("Compute & Auth", table_cell_bold),
            Paragraph("Cloudflare Worker<br/>(worker/src/index.ts)", table_cell_style),
            Paragraph("Stateless edge microservice executing OAuth 2.0 flows, session cryptographic validation (HMAC SHA-256), D1 queries, and Google Sheets orchestration.", table_cell_style)
        ],
        [
            Paragraph("Primary Storage", table_cell_bold),
            Paragraph("Cloudflare D1<br/>(Serverless SQLite)", table_cell_style),
            Paragraph("Authoritative SQL relational database storing users, sessions, shift logs, personnel rosters, custom columns, and sync audit logs.", table_cell_style)
        ],
        [
            Paragraph("Audit & Sync", table_cell_bold),
            Paragraph("Google Drive & Sheets API<br/>(v4 REST)", table_cell_style),
            Paragraph("Background replica created per user (ShiftLog Records). Receives non-blocking updates via Worker's waitUntil lifecycle.", table_cell_style)
        ],
        [
            Paragraph("Client Engine", table_cell_bold),
            Paragraph("jsPDF + AutoTable<br/>(src/lib/pdf.ts)", table_cell_style),
            Paragraph("Runs client-side in the browser. Renders filtered record sets directly to A4 Landscape vector PDF tables without server round-trips.", table_cell_style)
        ],
    ]
    arch_table = Table(arch_table_data, colWidths=[80, 120, 287])
    arch_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_blue),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, border_color),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, bg_light]),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(arch_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<b>Sequence of Operations:</b> When a supervisor registers a shift, the browser sends a POST request with the session cookie to <code>/api/records</code>. "
        "Pages Function transparently passes it to the Worker. The Worker validates the 90-day signed cookie, inserts the record and crew roster into D1 in an atomic transaction, "
        "and triggers a background worker task using <code>context.waitUntil()</code> to append the row to the user's Google Sheet. The response returns in under 60ms.",
        body_style
    ))

    story.append(PageBreak())

    # ==================== SECTION 3: DATABASE DESIGN ====================
    story.append(Paragraph("3. Database Design & Data Modeling", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_blue, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "NexDesk's data model is defined with <b>Prisma</b> and mapped into <b>Cloudflare D1 SQLite</b>. "
        "Strict foreign keys and multi-column indexes ensure multi-tenant isolation and millisecond query times.",
        body_style
    ))

    schema_table_data = [
        [Paragraph("Entity Model", table_header_style), Paragraph("Primary Fields", table_header_style), Paragraph("Key Constraints & Indexes", table_header_style)],
        [
            Paragraph("<b>User</b>", table_cell_style),
            Paragraph("id (cuid), email, name, image, googleId, createdAt, updatedAt", table_cell_style),
            Paragraph("Unique: email, googleId. Cascades deletion to records and settings.", table_cell_style)
        ],
        [
            Paragraph("<b>ShiftRecord</b>", table_cell_style),
            Paragraph("id, userId, dateStr, date, shift (Day/Night), supervisedBy, factoryName, location, personsCount, remarks, customValues (JSON), syncStatus, sheetRowIndex", table_cell_style),
            Paragraph("Indexes: (userId, dateStr), (userId, shift), (userId, supervisedBy), (userId, factoryName), (userId, location). Zero-timezone offset via dateStr.", table_cell_style)
        ],
        [
            Paragraph("<b>RecordPerson</b>", table_cell_style),
            Paragraph("id, recordId, personIndex (1-20), name, createdAt", table_cell_style),
            Paragraph("Foreign Key: recordId -> ShiftRecord (Cascade). Index: (recordId), (name). Normalizes crew rosters.", table_cell_style)
        ],
        [
            Paragraph("<b>GoogleIntegration</b>", table_cell_style),
            Paragraph("id, userId, spreadsheetId, spreadsheetName, sheetTabName, accessToken, refreshToken (AES-GCM encrypted), tokenExpiry, syncStatus, lastSyncAt, lastError", table_cell_style),
            Paragraph("Unique: userId. Enforces one Google connection per supervisor account.", table_cell_style)
        ],
        [
            Paragraph("<b>CustomColumn</b>", table_cell_style),
            Paragraph("id, userId, key (sanitized slug), name, type (TEXT, NUMBER, DATE, SELECT), options (JSON), required, order, isDeleted", table_cell_style),
            Paragraph("Unique: (userId, key). Index: (userId, order). Enables dynamic tenant schema customization.", table_cell_style)
        ],
        [
            Paragraph("<b>SyncAuditLog</b>", table_cell_style),
            Paragraph("id, userId, operation (DISCOVER, CREATE_SHEET, SYNC_RECORD, IMPORT, REPAIR), status, details, createdAt", table_cell_style),
            Paragraph("Index: (userId, createdAt). Provides full audit trail of synchronization events.", table_cell_style)
        ],
    ]
    schema_table = Table(schema_table_data, colWidths=[95, 200, 192])
    schema_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_blue),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, border_color),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, bg_light]),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(schema_table)

    story.append(Spacer(1, 10))

    # ==================== SECTION 4: APPLICATION FEATURES ====================
    story.append(Paragraph("4. Core Application Features & Workflows", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_blue, spaceBefore=2, spaceAfter=10))

    features = [
        ("Google OAuth 2.0 & Session Security", "Uses signed HTTP-only cookies with HMAC SHA-256 signatures, 90-day persistence, and AES-GCM 256-bit token encryption at rest. Never exposes refresh tokens to the client browser."),
        ("Fast Shift Recording (add-record)", "Supports up to 20 workers per shift with dynamic name autocompletion, instant headcount calculation, shift assignment (Day/Night), factory & location selectors, and individual notes."),
        ("Tenant-Scoped Autocomplete", "Suggestions for supervisors, factories, workers, and locations are strictly partitioned by userId in D1, preventing data leakage across different company tenants."),
        ("Advanced History & Audit (history)", "Server-side indexed filtering by exact date, date range, shift, supervisor, location, or employee name. Computes duty-days and aggregate headcounts in real-time with pagination (50 per page)."),
        ("Dynamic Custom Schema", "Supervisors can define bespoke fields (e.g. Machine ID, Batch Number, Inspection Status) which automatically render in the input form, history cards, and the PDF export table."),
        ("Resilient Google Sheets Sync", "Automatically discovers or creates a 'ShiftLog Records' sheet with formatting and headers. Supports manual repair, resync, and historical data import."),
    ]
    for title, desc in features:
        story.append(Paragraph(f"• <b>{title}:</b> {desc}", bullet_style))

    story.append(PageBreak())

    # ==================== SECTION 5: DEEP DIVE INTO PDF MAKING ====================
    story.append(Paragraph("5. Deep-Dive: PDF Generation & Export Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_blue, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "A cornerstone feature of NexDesk is its built-in client-side PDF export system implemented in "
        "<code>src/lib/pdf.ts</code> and consumed by <code>src/components/pdf-export-button.tsx</code>. "
        "Unlike systems that rely on heavy headless browsers (Puppeteer/Chromium) or server-side renderers, "
        "NexDesk generates crisp, print-ready vector documents directly within the supervisor's browser.",
        body_style
    ))

    story.append(Paragraph("5.1 Technical Stack & Core Dependencies", h2_style))
    story.append(Paragraph(
        "The PDF subsystem leverages two lightweight libraries: "
        "<b>jsPDF (v4.2.1)</b> for raw PDF document construction, page geometries, font rendering, and coordinate layout; "
        "and <b>jspdf-autotable (v5.0.9)</b> for responsive tabular grid formatting, automatic line-wrapping, and multi-page pagination.",
        body_style
    ))

    story.append(Paragraph("5.2 Page Geometry & Layout Specifications", h2_style))
    geom_data = [
        [Paragraph("Property", table_header_style), Paragraph("Specification", table_header_style), Paragraph("Technical Rationale", table_header_style)],
        [Paragraph("Page Format", table_cell_bold), Paragraph("A4 (297mm x 210mm)", table_cell_style), Paragraph("Standard international document size used in manufacturing facilities.", table_cell_style)],
        [Paragraph("Orientation", table_cell_bold), Paragraph("Landscape", table_cell_style), Paragraph("Factory shift logs contain 10+ columns; landscape maximizes horizontal space.", table_cell_style)],
        [Paragraph("Unit of Measurement", table_cell_bold), Paragraph("Millimeters (mm)", table_cell_style), Paragraph("Provides precise sub-millimeter typography and margin control.", table_cell_style)],
        [Paragraph("Page Margins", table_cell_bold), Paragraph("Left: 14mm, Right: 14mm, Bottom: 18mm", table_cell_style), Paragraph("Ensures printable area fits on all laser and thermal office printers.", table_cell_style)],
        [Paragraph("Grid Typography", table_cell_bold), Paragraph("Helvetica 7pt, 1.5mm cell padding", table_cell_style), Paragraph("High information density allowing up to 35 records per page.", table_cell_style)],
        [Paragraph("Border & Color", table_cell_bold), Paragraph("0.15mm black lines, white background", table_cell_style), Paragraph("Low-ink footprint, high contrast, photocopier friendly.", table_cell_style)],
    ]
    geom_table = Table(geom_data, colWidths=[100, 150, 237])
    geom_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_blue),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, border_color),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, bg_light]),
        ("PADDING", (0, 0), (-1, -1), 4.5),
    ]))
    story.append(geom_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("5.3 Walkthrough of PDF Construction (src/lib/pdf.ts)", h2_style))
    story.append(Paragraph(
        "The core export function is <code>generateShiftLogPDF(records, filterSummary, customColumns)</code>. "
        "It executes through four systematic stages:",
        body_style
    ))

    stages = [
        ("1. Header & Metadata Injection", "Draws the primary title 'NexDesk shift records' at coordinates (14, 12) using bold 12pt Helvetica. Immediately below at (14, 18), it prints generation timestamp and total record count."),
        ("2. Active Filter Criteria Banner", "Parses active UI filter state (date range, shift, supervisor, location, employee). Compiles them into a pipe-separated criteria line (e.g. 'Range: 2026-10-01 to 2026-10-31 | Shift: Night | Factory: Plant-A'). If no filters are active, it outputs 'All Historical Records (No filters applied)'."),
        ("3. Dynamic Table Data Assembly", "Iterates over the records array. If filtering by an individual employee, it dynamically displays that employee's name and notes. It unpacks dynamic custom column values (customValues[col.key]) and appends remarks."),
        ("4. AutoTable Rendering & Column Sizing", "Invokes autoTable() with strict column widths: # (8mm), Date (20mm), Shift (15mm), Supervisor (25mm), Factory (25mm), Location (22mm), Headcount (18mm), Names (46mm), Custom Columns, and Remarks."),
        ("5. Dynamic Multi-Page Page Numbering", "Registers a didDrawPage hook in jsPDF. Computes totalPages and currentPage dynamically to draw centered footers: 'NexDesk | Page X of Y' on every generated page."),
    ]
    for stitle, sdesc in stages:
        story.append(Paragraph(f"• <b>{stitle}:</b> {sdesc}", bullet_style))

    story.append(Spacer(1, 8))
    story.append(Paragraph("5.4 Asynchronous UI Integration (src/components/pdf-export-button.tsx)", h2_style))
    story.append(Paragraph(
        "In <code>PDFExportButton</code>, the generation process is handled asynchronously to prevent UI freezing:",
        body_style
    ))
    story.append(Paragraph(
        "1. When clicked, <code>isExporting</code> is set to true, rendering a spinning <code>Loader2</code> icon.<br/>"
        "2. A short microtask delay (<code>await new Promise(r => setTimeout(r, 50))</code>) yields execution to the main thread so the browser repaints the spinner.<br/>"
        "3. <code>generateShiftLogPDF()</code> compiles the vector document.<br/>"
        "4. A dynamic filename is generated based on applied filters: <code>ShiftLog_Report_{startDate}_to_{endDate}.pdf</code> or <code>ShiftLog_Report_{date}.pdf</code>.<br/>"
        "5. <code>doc.save(filename)</code> prompts the user's browser download directly.",
        code_style
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("5.5 Companion Attendance Side-Table with Green/Red Status", h2_style))
    story.append(Paragraph(
        "Alongside the main shift log table, the PDF engine now generates a dedicated <b>Worker Attendance Side Table</b> "
        "(width: 42mm, positioned from x=241mm to x=283mm on Landscape A4). It cross-references the factory's "
        "master worker roster against shift personnel in the main table:",
        body_style
    ))
    story.append(Paragraph(
        "• <b>Green Highlighting (#166534 / #F0FDF4):</b> Workers who attended work that day or appear in the main shift records table are marked in bold green text with a soft green background.<br/>"
        "• <b>Red Highlighting (#B91C1C / #FEF2F2):</b> Workers absent or not recorded on that day's shift roster are marked in bold red text with a soft red background.",
        body_style
    ))

    # Visual demonstration table
    demo_header = [Paragraph("Worker", table_header_style), Paragraph("Shift Status", table_header_style)]
    demo_green_cell = ParagraphStyle("DemoGreen", parent=body_style, fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#166534"))
    demo_red_cell = ParagraphStyle("DemoRed", parent=body_style, fontName="Helvetica-Bold", fontSize=8, textColor=colors.HexColor("#b91c1c"))

    demo_data = [
        demo_header,
        [Paragraph("Tuhin", demo_green_cell), Paragraph("Present (Worked)", demo_green_cell)],
        [Paragraph("Rahim", demo_green_cell), Paragraph("Present (Worked)", demo_green_cell)],
        [Paragraph("Karim", demo_green_cell), Paragraph("Present (Worked)", demo_green_cell)],
        [Paragraph("Jamal", demo_green_cell), Paragraph("Present (Worked)", demo_green_cell)],
        [Paragraph("Fatima", demo_red_cell), Paragraph("Absent (Off)", demo_red_cell)],
        [Paragraph("Tariq", demo_red_cell), Paragraph("Absent (Off)", demo_red_cell)],
        [Paragraph("Hasan", demo_green_cell), Paragraph("Present (Worked)", demo_green_cell)],
        [Paragraph("Tuhel", demo_red_cell), Paragraph("Absent (Off)", demo_red_cell)],
    ]
    demo_table = Table(demo_data, colWidths=[120, 140])
    demo_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("GRID", (0, 0), (-1, -1), 0.5, border_color),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f0fdf4")),
        ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#f0fdf4")),
        ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#f0fdf4")),
        ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#f0fdf4")),
        ("BACKGROUND", (0, 5), (-1, 5), colors.HexColor("#fef2f2")),
        ("BACKGROUND", (0, 6), (-1, 6), colors.HexColor("#fef2f2")),
        ("BACKGROUND", (0, 7), (-1, 7), colors.HexColor("#f0fdf4")),
        ("BACKGROUND", (0, 8), (-1, 8), colors.HexColor("#fef2f2")),
        ("PADDING", (0, 0), (-1, -1), 3.5),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
    ]))

    story.append(Spacer(1, 4))
    story.append(demo_table)

    story.append(PageBreak())

    # ==================== SECTION 6: DECISIONS AND HARDENING ====================
    story.append(Paragraph("6. Solved Production Challenges & Hardening", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_blue, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "During development and production deployment on Cloudflare, several real-world issues were diagnosed and resolved:",
        body_style
    ))

    fixes_data = [
        [Paragraph("Observed Problem", table_header_style), Paragraph("Root Cause", table_header_style), Paragraph("Engineered Fix", table_header_style)],
        [
            Paragraph("Large history pages became slow", table_cell_bold),
            Paragraph("Unbounded client-side DOM rendering of all historic records.", table_cell_style),
            Paragraph("Implemented D1 SQL pagination with limit and offset. All filters execute at the database layer before pagination.", table_cell_style)
        ],
        [
            Paragraph("Sheets too slow for live queries", table_cell_bold),
            Paragraph("Querying Google Sheets REST API on every page interaction caused 2-5s latency.", table_cell_style),
            Paragraph("Separated D1 as the live query database; relegated Google Sheets to non-blocking background synchronization.", table_cell_style)
        ],
        [
            Paragraph("Missing sheet broke sync", table_cell_bold),
            Paragraph("New users did not have the pre-configured spreadsheet in Drive.", table_cell_style),
            Paragraph("Worker automatically searches for or creates 'ShiftLog Records' with the required header schema when absent.", table_cell_style)
        ],
        [
            Paragraph("Suggestions leaked across tenants", table_cell_bold),
            Paragraph("Querying autocomplete values without strict user session scoping.", table_cell_style),
            Paragraph("Every suggestion query is strictly scoped to the authenticated session's userId.", table_cell_style)
        ],
        [
            Paragraph("PDF looked like fluffy report", table_cell_bold),
            Paragraph("Initial designs used excessive decorative styling, large headers, and large margins.", table_cell_style),
            Paragraph("Redesigned to a high-density, low-ink, single-line tabular format optimized for industrial clipboards.", table_cell_style)
        ],
        [
            Paragraph("Frequent session logouts", table_cell_bold),
            Paragraph("Default session cookies expired prematurely.", table_cell_style),
            Paragraph("Configured signed HTTP-only cookies with explicit 90-day Max-Age and Expires timestamps.", table_cell_style)
        ],
    ]
    fixes_table = Table(fixes_data, colWidths=[120, 160, 207])
    fixes_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), brand_blue),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, border_color),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, bg_light]),
        ("PADDING", (0, 0), (-1, -1), 4.5),
    ]))
    story.append(fixes_table)

    story.append(Spacer(1, 15))

    # ==================== SECTION 7: DEPLOYMENT & MAINTENANCE ====================
    story.append(Paragraph("7. Deployment, Security & Maintenance Guide", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=brand_blue, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph(
        "<b>Deployment Instructions:</b><br/>"
        "1. <b>Build Frontend:</b> Run <code>npm run build</code> to produce static assets in the <code>out</code> directory.<br/>"
        "2. <b>Deploy Worker:</b> Run <code>npx wrangler deploy --config worker/wrangler.jsonc</code>.<br/>"
        "3. <b>Deploy Pages:</b> Run <code>npx wrangler pages deploy out --project-name nexdesk --branch main</code>.<br/>"
        "4. <b>Set Worker Secrets:</b> Configure <code>SESSION_SECRET</code>, <code>TOKEN_ENCRYPTION_KEY</code>, <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>APP_ORIGIN</code>.",
        body_style
    ))

    story.append(Paragraph(
        "<b>Security Principles:</b><br/>"
        "• All secrets remain encrypted in Cloudflare Worker secret vaults; never commit .env files or tokens.<br/>"
        "• Google OAuth scopes are limited strictly to user identity and Drive file/Sheets permissions.<br/>"
        "• D1 database binds directly to the Worker runtime, completely inaccessible from the public web.<br/>"
        "• All PDF generation is isolated to the client browser, eliminating data transmission to external PDF rendering services.",
        body_style
    ))

    story.append(Spacer(1, 20))
    # Sign-off card
    sign_off_data = [
        [
            Paragraph("<b>Document Status:</b> Verified & Final", body_style),
            Paragraph("<b>Architecture Approval:</b> Ready for Production", body_style),
            Paragraph("<b>Engine:</b> NexDesk PDF Core", body_style),
        ]
    ]
    sign_off_table = Table(sign_off_data, colWidths=[162, 162, 163])
    sign_off_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ("BORDER", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(sign_off_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "NexDesk_Project_and_PDF_Architecture_Report.pdf"
    create_project_pdf(out_file)
