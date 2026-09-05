const fs = require("fs");
let res = "";
for (let i = 1; i <= 3; i++) {
  let text = fs.readFileSync("generate_farmer_" + i + ".js", "utf8");
  let parts = text.split("\nconst content = `\n");
  if (parts.length > 1) {
    let inner = parts[1];
    let endIdx = inner.lastIndexOf("`;\nfs.writeFileSync");
    if (endIdx === -1) endIdx = inner.lastIndexOf("`;");
    res += inner.substring(0, endIdx);
  }
}
fs.writeFileSync("src/routes/farmer.tsx", res);
