from fpdf import FPDF
import os

class ProjectPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "Desert Vegetation Change Tracker", align="R")
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(34, 85, 34)
        self.cell(0, 12, title)
        self.ln(14)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(60, 60, 60)
        self.cell(0, 10, title)
        self.ln(12)

    def body_text(self, text):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 7, text)
        self.ln(4)

    def bullet(self, text):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(40, 40, 40)
        x = self.get_x()
        self.cell(8, 7, "-")
        self.multi_cell(0, 7, text)
        self.ln(2)

    def table_row(self, col1, col2, col3, bold=False):
        style = "B" if bold else ""
        self.set_font("Helvetica", style, 10)
        if bold:
            self.set_fill_color(34, 85, 34)
            self.set_text_color(255, 255, 255)
        else:
            self.set_fill_color(245, 245, 245)
            self.set_text_color(40, 40, 40)
        self.cell(40, 9, col1, border=1, fill=True)
        self.cell(50, 9, col2, border=1, fill=True)
        self.cell(0, 9, col3, border=1, fill=True)
        self.ln()


pdf = ProjectPDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=20)

# --- COVER PAGE ---
pdf.add_page()
pdf.ln(50)
pdf.set_font("Helvetica", "B", 32)
pdf.set_text_color(34, 85, 34)
pdf.cell(0, 15, "Desert Vegetation", align="C")
pdf.ln(18)
pdf.cell(0, 15, "Change Tracker", align="C")
pdf.ln(25)
pdf.set_font("Helvetica", "", 14)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 10, "Satellite-Based Monitoring of Afforestation Efforts", align="C")
pdf.ln(8)
pdf.cell(0, 10, "Taklimakan Desert, Xinjiang, China", align="C")
pdf.ln(30)
pdf.set_font("Helvetica", "", 11)
pdf.cell(0, 8, "Project Documentation v1.0", align="C")
pdf.ln(6)
pdf.cell(0, 8, "March 2026", align="C")

# --- PAGE 2: OVERVIEW ---
pdf.add_page()
pdf.section_title("1. Project Overview")
pdf.body_text(
    "The Desert Vegetation Change Tracker is a web-based tool that uses satellite imagery "
    "to monitor vegetation changes around the Taklimakan Desert in Xinjiang, China. "
    "It helps researchers, environmental agencies, and conservation organizations track "
    "whether desert containment and afforestation efforts are succeeding."
)
pdf.body_text(
    "China has been undertaking massive afforestation projects around the Taklimakan Desert, "
    "including the Three-North Shelter Forest Program and the Taklimakan Desert green belt "
    "encirclement project. This tool provides objective, data-driven measurements to evaluate "
    "the effectiveness of these efforts over time."
)

pdf.section_title("2. The Problem")
pdf.body_text(
    "Desertification threatens millions of hectares of productive land. China's afforestation "
    "programs plant billions of trees, but measuring success is difficult:"
)
pdf.bullet("Manual ground surveys are slow and cover limited areas")
pdf.bullet("There is no easy way to visualize vegetation changes over large regions")
pdf.bullet("Early signs of vegetation stress or failure go undetected")
pdf.bullet("Progress reports lack objective, verifiable satellite data")

pdf.section_title("3. The Solution")
pdf.body_text(
    "This tool uses freely available satellite data from Google Earth Engine to automatically "
    "compute NDVI (Normalized Difference Vegetation Index) -- a standard measure of vegetation "
    "health -- across any selected area. Users interact with an intuitive web dashboard to:"
)
pdf.bullet("View an interactive map centered on the Taklimakan Desert")
pdf.bullet("Draw polygons to select specific areas of interest")
pdf.bullet("Compare vegetation between different years with color-coded overlays")
pdf.bullet("Track vegetation trends over time with interactive charts")
pdf.bullet("Use preset regions for known afforestation zones")

# --- PAGE 3: HOW IT WORKS ---
pdf.add_page()
pdf.section_title("4. How It Works")

pdf.sub_title("4.1 NDVI - Measuring Vegetation")
pdf.body_text(
    "NDVI (Normalized Difference Vegetation Index) is computed from satellite imagery using "
    "the formula: NDVI = (NIR - Red) / (NIR + Red), where NIR is near-infrared reflectance "
    "and Red is visible red reflectance. Healthy vegetation strongly reflects NIR light and "
    "absorbs red light, producing high NDVI values."
)
pdf.bullet("NDVI < 0.1: Bare sand, rock, or water")
pdf.bullet("NDVI 0.1 - 0.2: Sparse, stressed vegetation")
pdf.bullet("NDVI 0.2 - 0.4: Moderate vegetation (shrubs, grassland)")
pdf.bullet("NDVI > 0.4: Dense, healthy vegetation (forest, crops)")

pdf.sub_title("4.2 Data Pipeline")
pdf.body_text(
    "1. User selects a region of interest on the interactive map\n"
    "2. The backend queries Google Earth Engine for Sentinel-2 satellite imagery\n"
    "3. NDVI is computed for each time period requested\n"
    "4. Change detection compares NDVI between years\n"
    "5. Results are rendered as map overlays and time-series charts"
)

pdf.sub_title("4.3 Data Source")
pdf.body_text(
    "The tool uses Sentinel-2 imagery from the European Space Agency (ESA), accessed through "
    "Google Earth Engine. Sentinel-2 provides 10-meter resolution imagery every 5 days, "
    "enabling detailed vegetation monitoring. Historical data is available from 2015 onwards. "
    "All processing happens in the cloud -- no large file downloads needed."
)

# --- PAGE 4: TECH STACK ---
pdf.add_page()
pdf.section_title("5. Technical Architecture")

pdf.sub_title("5.1 Tech Stack")
pdf.table_row("Layer", "Technology", "Purpose", bold=True)
pdf.table_row("Data", "Google Earth Engine", "Satellite imagery & cloud processing")
pdf.table_row("Backend", "Python + FastAPI", "REST API server")
pdf.table_row("Frontend", "React + Vite", "Web application framework")
pdf.table_row("Maps", "Leaflet.js", "Interactive map rendering")
pdf.table_row("Charts", "Recharts", "Time-series data visualization")
pdf.ln(8)

pdf.sub_title("5.2 Project Structure")
pdf.set_font("Courier", "", 9)
pdf.set_text_color(40, 40, 40)
structure = (
    "desert-tracker/\n"
    "  backend/\n"
    "    main.py                 # FastAPI entry point\n"
    "    requirements.txt        # Python dependencies\n"
    "    services/\n"
    "      gee_service.py        # Google Earth Engine integration\n"
    "      ndvi_service.py       # NDVI computation & analysis\n"
    "    routers/\n"
    "      analysis.py           # API endpoints\n"
    "  frontend/\n"
    "    package.json\n"
    "    src/\n"
    "      App.jsx               # Main app component\n"
    "      components/\n"
    "        Map.jsx             # Interactive Leaflet map\n"
    "        Timeline.jsx        # Year/date range selector\n"
    "        NDVIChart.jsx       # Vegetation trend chart\n"
    "        Legend.jsx           # NDVI color legend"
)
pdf.multi_cell(0, 5, structure)
pdf.ln(6)

pdf.sub_title("5.3 API Endpoints")
pdf.set_font("Helvetica", "", 11)
pdf.bullet("POST /api/analyze -- Accept region polygon + year range, return NDVI change data")
pdf.bullet("GET /api/timeseries -- Return monthly/yearly NDVI for a region over time")
pdf.bullet("GET /api/tile/{z}/{x}/{y} -- Serve NDVI map tiles for the Leaflet overlay")

# --- PAGE 5: GETTING STARTED ---
pdf.add_page()
pdf.section_title("6. Getting Started")

pdf.sub_title("6.1 Prerequisites")
pdf.bullet("Python 3.9 or higher")
pdf.bullet("Node.js 18 or higher")
pdf.bullet("A Google Earth Engine account (free at earthengine.google.com)")
pdf.ln(4)

pdf.sub_title("6.2 Setup Steps")
pdf.body_text("Step 1: Authenticate with Google Earth Engine")
pdf.set_font("Courier", "", 10)
pdf.cell(0, 7, "  $ earthengine authenticate")
pdf.ln(10)

pdf.set_font("Helvetica", "", 11)
pdf.body_text("Step 2: Start the backend server")
pdf.set_font("Courier", "", 10)
pdf.cell(0, 7, "  $ cd backend")
pdf.ln(6)
pdf.cell(0, 7, "  $ pip install -r requirements.txt")
pdf.ln(6)
pdf.cell(0, 7, "  $ uvicorn main:app --reload")
pdf.ln(10)

pdf.set_font("Helvetica", "", 11)
pdf.body_text("Step 3: Start the frontend")
pdf.set_font("Courier", "", 10)
pdf.cell(0, 7, "  $ cd frontend")
pdf.ln(6)
pdf.cell(0, 7, "  $ npm install")
pdf.ln(6)
pdf.cell(0, 7, "  $ npm run dev")
pdf.ln(10)

pdf.set_font("Helvetica", "", 11)
pdf.body_text("Step 4: Open your browser and navigate to http://localhost:5173")

pdf.sub_title("6.3 Demo Mode")
pdf.body_text(
    "The application includes a demo mode with bundled sample data that works without "
    "Google Earth Engine credentials. This lets you explore the interface and understand "
    "the workflow before setting up a GEE account."
)

# --- PAGE 6: ROADMAP ---
pdf.add_page()
pdf.section_title("7. Development Roadmap")

pdf.sub_title("Phase 1: Foundation")
pdf.bullet("Project setup with backend (FastAPI) and frontend (React + Vite)")
pdf.bullet("Google Earth Engine integration for satellite data access")
pdf.bullet("Basic NDVI computation pipeline")
pdf.ln(4)

pdf.sub_title("Phase 2: Core Features")
pdf.bullet("Interactive map with polygon drawing tools")
pdf.bullet("NDVI change detection between two time periods")
pdf.bullet("Color-coded map overlays showing vegetation changes")
pdf.bullet("Time-series charts for vegetation trend analysis")
pdf.ln(4)

pdf.sub_title("Phase 3: Polish")
pdf.bullet("Preset regions for known afforestation zones")
pdf.bullet("Demo mode with sample data")
pdf.bullet("Responsive design for mobile/tablet use")
pdf.bullet("Export results as images and reports")
pdf.ln(4)

pdf.sub_title("Phase 4: Advanced (Future)")
pdf.bullet("Machine learning land cover classification")
pdf.bullet("Automated alerts for vegetation decline")
pdf.bullet("Sand dune movement tracking")
pdf.bullet("Carbon sequestration estimation")
pdf.bullet("Integration with ground-truth field station data")
pdf.ln(8)

pdf.section_title("8. Impact")
pdf.body_text(
    "This tool aims to provide objective, data-driven measurements of desert containment "
    "progress. By making satellite analysis accessible through a simple web interface, it "
    "empowers researchers, NGOs, and government agencies to monitor afforestation success, "
    "detect early failures, prioritize resources, and create verifiable progress reports "
    "for stakeholders and funders."
)

# Save
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Desert_Vegetation_Change_Tracker.pdf")
pdf.output(output_path)
print(f"PDF saved to: {output_path}")
