# Generate PDF from HTML Documentation

## Option 1: Using Browser (Easiest)

1. **Open the HTML file:**
   - Double-click `PROJECT_DOCUMENTATION.html` in your file explorer
   - Or open in your browser: `chrome`, `edge`, `firefox`, etc.

2. **Print to PDF:**
   - Press `Ctrl + P` (Windows) or `Cmd + P` (Mac)
   - Select printer: **"Save as PDF"** or **"Print to File"**
   - Choose location: Same folder as documentation
   - Click **"Save"**

## Option 2: Using Command Line (Windows)

### Method A: PowerShell Script
```powershell
# Open HTML and print to PDF (requires Windows 10+)
$HtmlFile = "C:\Users\ChaitsPC\Desktop\Simple Task Management System\PROJECT_DOCUMENTATION.html"
$PdfFile = "C:\Users\ChaitsPC\Desktop\Simple Task Management System\PROJECT_DOCUMENTATION.pdf"

# Using Edge browser (Windows 10+)
Start-Process -FilePath "msedge.exe" -ArgumentList "--print-to-pdf=$PdfFile","--headless","$HtmlFile" -Wait
```

### Method B: Using Python (if weasyprint installed)
```bash
pip install weasyprint
python convert_to_pdf.py
```

### Method C: Using npm/Node.js
```bash
npm install -g html-pdf
html-pdf PROJECT_DOCUMENTATION.html PROJECT_DOCUMENTATION.pdf
```

## Option 3: Online Converter

If you prefer not to install anything:

1. Go to: https://cloudconvert.com/html-to-pdf
2. Upload `PROJECT_DOCUMENTATION.html`
3. Select output format: **PDF**
4. Click **"Convert"**
5. Download the PDF

## Option 4: Using LibreOffice (if installed)

```bash
soffice --headless --convert-to pdf PROJECT_DOCUMENTATION.html
```

---

## ✅ Available Files

| File | Type | Size | Purpose |
|------|------|------|---------|
| `PROJECT_DOCUMENTATION.html` | HTML | 39 KB | Full documentation (browser-readable) |
| `PROJECT_DOCUMENTATION.md` | Markdown | 26 KB | Full documentation (raw text) |
| `README.md` | Markdown | 19 KB | Project overview |
| `TASK_DEPENDENCIES.md` | Markdown | 9 KB | Task dependencies feature guide |
| `convert_to_pdf.py` | Python | - | Auto-conversion script |

---

## 📖 Documentation Contents

The documentation includes:

1. **Architecture Overview** - System design, directory structure
2. **Tech Stack** - Frontend, backend, database technologies
3. **Database Models** - User, Task, Comment, Notification schemas
4. **Authentication & Authorization** - JWT, OAuth, role-based access
5. **API Endpoints** - Complete REST API reference (45+ endpoints)
6. **Core Features** - Task management, dependencies, collaboration
7. **Real-Time Features** - Socket.io implementation
8. **Email & Notifications** - Multi-channel notification system
9. **File Management** - Attachments, versioning, storage
10. **Frontend Pages** - All user and admin pages
11. **Security Features** - Password hashing, JWT, input validation
12. **Deployment Checklist** - Production setup guide

---

## 🎯 Key Information in Documentation

- **Complete API reference** with all 45+ endpoints
- **Database relationships** and schemas
- **Authentication flow** (Registration, Login, Google OAuth)
- **Real-time communication** via Socket.io
- **Email notification types** and user preferences
- **File attachment versioning** with rollback
- **Task dependency prevention** algorithms
- **Security features** and best practices
- **Request/response examples** (JSON format)
- **Deployment instructions** and checklist

---

## 💡 Quick Stats

- **Total Pages** (HTML print): ~12-15 pages when printed
- **Total Pages** (PDF): ~10-12 pages
- **Sections**: 10 major sections
- **API Endpoints Documented**: 45+
- **Tables**: 15+
- **Code Examples**: 8+
- **Diagrams**: 3+

---

## ✨ Recommended Usage

1. **For Reading**: Open `PROJECT_DOCUMENTATION.html` in browser
2. **For Printing**: Use browser print to PDF (Ctrl+P → Save as PDF)
3. **For Sharing**: Use the PDF generated from print
4. **For Development**: Reference `PROJECT_DOCUMENTATION.md` in text editor

---

**Last Updated**: August 2026  
**Format**: HTML (responsive, printable to PDF)  
**Size**: ~40 KB
