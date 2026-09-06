const fs = require("fs");
let code = fs.readFileSync("src/routes/admin.tsx", "utf8");

code = code.replace(
  /\{p\.latitude\.toFixed\(4\)\}, \{p\.longitude\.toFixed\(4\)\}/,
  `{p.latitude.toFixed(4)}, {p.longitude?.toFixed(4)}`
);

code = code.replace(
  /options: form\.options,/,
  `options: form.options || [],`
);

code = code.replace(
  /options: form\.options\?\.filter\(\(_, idx\) => idx !== i\),/,
  `options: form.options?.filter((_, idx) => idx !== i) || [],`
);

fs.writeFileSync("src/routes/admin.tsx", code);