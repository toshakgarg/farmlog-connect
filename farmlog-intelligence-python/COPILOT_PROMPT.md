# Copilot Prompt — Wire Python API into farmlog-connect

Paste this into Copilot in VS Code after setting up the Python service.

---

```
I have a farmlog-connect React + TypeScript + Expo project.
I have replaced the Azure Functions TypeScript pipeline with a 
Python FastAPI service running at http://localhost:8000

New files to add to farmlog-connect:

1. Copy src/api/formIntelligence.ts from the python package into 
   farmlog-connect/src/api/formIntelligence.ts
   (replaces the old TypeScript version — same interface, different URL)

2. Copy src/hooks/useFormSetup.ts into farmlog-connect/src/hooks/
3. Copy src/hooks/useFormDigitize.ts into farmlog-connect/src/hooks/
   (replaces useFormReader.ts — new two-step upload + digitize flow)

4. Add to farmlog-connect/.env:
   VITE_FORM_INTELLIGENCE_URL=http://localhost:8000

Now update the UI:

### Admin UI — find the admin settings/form templates section and ensure:
- File picker (image/jpeg, image/png only)
- Form code input (optional, placeholder "e.g. JOITA-CCF-F01")
- "Scan & Create Template" button → calls useFormSetup.run()
- Progress bar while processing (show percentage)
- On done: green panel showing form_title, field_count, schema_id (copyable)
- On error: red panel with error message

### Supervisor UI — find supervisor form entry section and ensure:
STEP 1 — Upload:
- Dropdown: select form template (calls listSchemas() from formIntelligence.ts on mount)
- Multi-photo picker (multiple files, image/* )
- "Upload Photos" button → calls useFormDigitize.upload()
- Shows: "3 photos uploaded. Ready to digitize."
- Badge on digitize button showing pending count

STEP 2 — Digitize (shown after upload OR when pendingCount > 0):
- "You have {N} photos waiting to be digitized"
- "Digitize All" button → calls useFormDigitize.digitize()
- Progress bar while running
- On done: table showing key → value → confidence%
- Low confidence fields (<60%) highlighted in yellow with ⚠ icon
- "Save to Database" button (data is already saved — this just confirms)

Use existing app styles — no new CSS libraries.
Run npm run typecheck after changes and fix any errors.
```
