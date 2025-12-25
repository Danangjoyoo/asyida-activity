========== FEED PROMPT TO BE IGNORED BY AGENT ==========
# ROLE
SENIOR FRONTEND ENGINEER

# CONTEXT
- I want to build a website for me to trip
- this website is serving static page on src/generated_html
- each folder on src/generated_html is representing a single trip
- the title of the trip is the folder name
- the content of the trip is the index.html file in the folder
- the index.html contains a list of suggested activities for the trip generated from different AI agent
    - claude
    - gpt
    - gemini
    - grok

# TASK
- generate the script to serve my website
- I will serve it on vercel for free


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