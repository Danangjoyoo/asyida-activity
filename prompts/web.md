========== FEED PROMPT TO BE IGNORED BY AGENT ==========
# ROLE
You are a **Senior Frontend Engineer** with strong experience in:
- Static site hosting and deployment
- Modern frontend build tools (Vite, Next.js, or static site generators)
- Deploying websites to **Vercel**
- Creating interactive web experiences with vanilla JavaScript or React

# PROJECT CONTEXT
- I am building a personal **trip planning website**.
- The website serves **static HTML files** located under `src/generated_html`.
- Each **subfolder** inside `src/generated_html` represents a **single trip** (e.g., `2025-12-31`).
- Trip folder structure:
  - `index.html` - Main trip page with overview
  - `claude.html` - Activity suggestions from Claude
  - `gpt.html` - Activity suggestions from ChatGPT
  - `gemini.html` - Activity suggestions from Gemini
  - `grok.html` - Activity suggestions from Grok
- The **trip title** is the folder name (date-based, like `2025-12-31`).

# GOAL
Create an **interactive trip website** that:
1. **Orchestrates** all trip HTML files into a cohesive experience
2. Allows **switching** between different AI-generated activity suggestions
3. **Serves on Vercel for free** with optimal performance
4. Provides a **modern, responsive UI** for browsing trips and activities

# TASK
1. **Create a main index.html** that:
   - Lists all available trips (auto-discovered from `src/generated_html` folders)
   - Provides navigation to switch between trips
   - Shows an overview of each trip

2. **Enhance trip pages** to:
   - Add interactive tabs/buttons to switch between AI agent suggestions
   - Enable seamless navigation between `claude.html`, `gpt.html`, `gemini.html`, `grok.html`
   - Maintain the existing content while adding the interactive layer

3. **Setup Vercel deployment**:
   - Configure for static site hosting
   - Ensure proper routing for all trip pages
   - Optimize for performance and SEO

# REQUIREMENTS
- **Modern UI/UX**: Use Tailwind CSS for styling, create a clean and responsive design
- **Interactive Navigation**: Smooth transitions between different AI suggestions without page reloads
- **Auto-discovery**: Automatically detect and list all trip folders without hardcoding
- **Mobile-responsive**: Works well on both desktop and mobile devices
- **Fast loading**: Optimize for quick page loads and smooth interactions
- **Vercel-ready**: Complete configuration for hassle-free deployment

# DELIVERABLES
1. **Main index.html** - Trip listing and navigation hub
2. **Enhanced trip pages** - Interactive AI suggestion switching
3. **Vercel configuration** - `vercel.json` and any necessary build setup
4. **Shared assets** - CSS, JavaScript for interactive features
5. **Deployment guide** - Step-by-step Vercel deployment instructions

# TECHNICAL CONSTRAINTS
- Use **vanilla JavaScript** or **React** (choose based on complexity)
- **Tailwind CSS** for styling (via CDN or build process)
- **Static-first approach** - no server-side requirements
- **Progressive enhancement** - content should be accessible without JavaScript
- **Cross-browser compatibility** - modern browsers with graceful degradation

# EXAMPLE INTERACTION FLOW
1. User lands on main page → sees list of all trips
2. User clicks a trip (e.g., "2025-12-31") → loads trip overview
3. User sees tabs/buttons for "Claude", "GPT", "Gemini", "Grok"
4. User clicks "Claude" → loads claude.html content smoothly
5. User can switch between AI suggestions without page reload
6. User can navigate back to trip list or other trips


========== REFINED PROMPT TO READ BY AGENT ==========

# ROLE
You are a **Senior Frontend Engineer** with strong experience in:
- Static site hosting
- Node.js tooling and/or modern frontend build tools
- Deploying websites to **Vercel**

# PROJECT CONTEXT
- I am building a personal **trip website**.
- The website is composed of **static HTML files** located under `src/generated_html`.
- Each **subfolder** inside `src/generated_html` represents a **single trip**.
  - Example structure:
    - `src/generated_html/2025-12-31/index.html`
    - `src/generated_html/2025-12-31/claude.html`
    - `src/generated_html/2025-12-31/gpt.html`
    - `src/generated_html/2025-12-31/gemini.html`
    - `src/generated_html/2025-12-31/grok.html`
- The **trip title** is the folder name (e.g. `2025-12-31`).
- The **main content** of each trip is the `index.html` file in that folder.
- The `index.html` file contains a list of suggested activities for the trip, generated from different AI agents:
  - `claude.html`
  - `gpt.html`
  - `gemini.html`
  - `grok.html`

# GOAL
I want to **serve this website on Vercel for free** with minimal complexity, using the existing static HTML files in `src/generated_html`.

# TASK
- Design and generate all necessary **configuration and/or scripts** to serve my website on Vercel.
- Prefer a **static-export / static-file** approach (no unnecessary backend logic) if possible.
- If you have to code, write code in typescript and tailwindcss

# REQUIREMENTS
- **Input structure**
  - Root directory: `src/generated_html`
  - Each subdirectory under `src/generated_html` is a trip.
  - Each trip folder has:
    - `index.html` (main page for the trip)
    - Other HTML files (e.g. `claude.html`, `gpt.html`, `gemini.html`, `grok.html`) that may be linked from `index.html`.

- **Serving behavior**
  - I should be able to open a trip by a URL that corresponds to its folder.
    - Example: `/2025-12-31/` should serve `src/generated_html/2025-12-31/index.html`.
  - All other HTML files in the trip folder (like `claude.html`, `gpt.html`, etc.) should also be directly accessible by URL.
    - Example: `/2025-12-31/claude.html` should serve `src/generated_html/2025-12-31/claude.html`.

- **On Vercel**
  - Provide the **exact project structure** and files I need (e.g. `vercel.json`, `package.json`, or any build config) to:
    - Deploy the site
    - Ensure Vercel serves the HTML files in `src/generated_html` correctly
  - Assume:
    - I’m okay with using Node.js tooling (e.g. a small script, build step, or framework minimal setup).
    - I want to keep it as **simple** as possible.

# DELIVERABLES
Provide:

1. **File list and purpose**
   - List all files you propose to add (e.g. `vercel.json`, `package.json`, `scripts/prepare-static.js`, etc.)
   - Short explanation of the role of each file.

2. **Full file contents**
   - The complete source code for each new or modified file.
   - Ensure paths and configurations are consistent with:
     - Root: project root
     - Static HTML root: `src/generated_html`

3. **Deployment instructions**
   - Step-by-step instructions for:
     - Installing dependencies (if any)
     - Running any build or preparation script (if needed)
     - Connecting the repo to Vercel
     - Setting the correct “output directory” / “build output” so Vercel serves the site correctly.

4. **Constraints**
   - Do not change the existing `src/generated_html` content or structure.
   - Do not require any paid Vercel features.
   - Prefer zero or minimal custom server code; use **static hosting** semantics whenever possible.

# STYLE
- Be precise and explicit in file paths and configuration fields.
- Use modern, recommended practices for Vercel as of your knowledge cutoff.
- Avoid unnecessary complexity; prefer the **simplest working solution**.