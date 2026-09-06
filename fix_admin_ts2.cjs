const fs = require("fs");
let code = fs.readFileSync("src/routes/admin.tsx", "utf8");

code = code.replace(/supervisorName = \((id)\) =>/, "supervisorName = (id: string) =>");

code = code.replace(/p\.location && \(/g, "p.latitude && (");
code = code.replace(/p\.location\.latitude/g, "p.latitude");
code = code.replace(/p\.location\.longitude/g, "p.longitude");

code = code.replace(
  `function RecordDetail({
  record,
  questions,
  supervisorName,
  onClose,
}: {
  record: FarmerRecord;
  questions: SurveyQuestion[];
  supervisorName: string;
  onClose: () => void;
}) {`,
  `function RecordDetail({
  record,
  questions,
  supervisorName,
  onClose,
}: {
  record: FarmerRecord;
  questions: SurveyQuestion[];
  supervisorName: string;
  onClose: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);`
);

code = code.replace(/optionsEn: \[\],?\s*optionsHi: \[\],?/g, "options: [],");
code = code.replace(/optionsEn: form.optionsEn,?\s*optionsHi: form.optionsHi,?/g, "options: form.options,");

code = code.replace(
  `checked={form.required}`,
  `checked={form.required ?? false}`
);
code = code.replace(
  `checked={form.farmerEditable}`,
  `checked={form.farmerEditable ?? false}`
);

// Complex options mapping replacement
code = code.replace(
  /if\(tempOptEn && tempOptHi\) \{\s*setForm\(\{\.\.\.form, optionsEn: \[\.\.\.\(form\.optionsEn\|\|\[\]\), tempOptEn\], optionsHi: \[\.\.\.\(form\.optionsHi\|\|\[\]\), tempOptHi\]\}\);\s*setTempOptEn\(""\);\s*setTempOptHi\(""\);\s*\}/,
  `if(tempOptEn && tempOptHi) {
                      setForm({...form, options: [...(form.options||[]), \`\${tempOptEn}|\${tempOptHi}\`]});
                      setTempOptEn("");
                      setTempOptHi("");
                    }`
);

code = code.replace(
  /\{form\.optionsEn && form\.optionsEn\.length > 0 && \(\s*<div className="flex flex-wrap gap-2 mt-4">\s*\{form\.optionsEn\.map\(\(opt, i\) => \(\s*<div key=\{i\} className="flex items-center gap-2 text-sm pl-3 pr-2 py-1\.5 bg-background rounded-full border border-border shadow-sm">\s*<span className="font-medium">\{opt\} <span className="text-muted-foreground font-normal">\(\{form\.optionsHi\?\.\[i\]\}\)<\/span><\/span>\s*<button className="flex items-center justify-center size-5 rounded-full bg-muted hover:bg-destructive\/10 text-muted-foreground hover:text-destructive transition-colors" onClick=\{\(\) => \{\s*setForm\(\{\s*\.\.\.form,\s*optionsEn: form\.optionsEn\?\.filter\(\(_, idx\) => idx !== i\),\s*optionsHi: form\.optionsHi\?\.filter\(\(_, idx\) => idx !== i\),\s*\}\);\s*\}\}>\s*<X className="size-3" \/>\s*<\/button>\s*<\/div>\s*\)\)\}\s*<\/div>\s*\)\}/,
  `{form.options && form.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {form.options.map((opt, i) => {
                    const [en, hi] = opt.split("|");
                    return (
                    <div key={i} className="flex items-center gap-2 text-sm pl-3 pr-2 py-1.5 bg-background rounded-full border border-border shadow-sm">
                      <span className="font-medium">{en} <span className="text-muted-foreground font-normal">({hi})</span></span>
                      <button className="flex items-center justify-center size-5 rounded-full bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" onClick={() => {
                        setForm({
                          ...form, 
                          options: form.options?.filter((_, idx) => idx !== i),
                        });
                      }}>
                        <X className="size-3" />
                      </button>
                    </div>
                  )})}
                </div>
              )}`
);

code = code.replace(
  /\{q\.type === "category" && q\.optionsEn && \(\s*<p className="text-\[12px\] text-muted-foreground mt-2 bg-muted\/50 p-2 rounded-lg truncate">\s*\{q\.optionsEn\.join\(", "\)\}\s*<\/p>\s*\)\}/,
  `{q.type === "category" && q.options && (
                    <p className="text-[12px] text-muted-foreground mt-2 bg-muted/50 p-2 rounded-lg truncate">
                      {q.options.map(o => o.split("|")[0]).join(", ")}
                    </p>
                  )}`
);

code = code.replace(
  /const move = async \(index: number, dir: -1 \| 1\) => \{\s*if \(index \+ dir < 0 \|\| index \+ dir >= questions\.length\) return;\s*const a = questions\[index\];\s*const b = questions\[index \+ dir\];\s*const t = a\.order;\s*a\.order = b\.order;\s*b\.order = t;\s*await saveQuestion\(a\);\s*await saveQuestion\(b\);\s*onChanged\(\);\s*\};/,
  `const move = async (index: number, dir: -1 | 1) => {
      if (index + dir < 0 || index + dir >= questions.length) return;
      const a = questions[index];
      const b = questions[index + dir];
      if (!a || !b) return;
      const t = a.order;
      a.order = b.order;
      b.order = t;
      await saveQuestion(a);
      await saveQuestion(b);
      onChanged();
    };`
);

fs.writeFileSync("src/routes/admin.tsx", code);