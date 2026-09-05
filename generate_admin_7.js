const fs = require("fs");
const content = `
            <div className="space-y-1.5 flex flex-col justify-center">
              <Label className="text-xs text-muted-foreground mb-2">Options</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={form.required}
                    onCheckedChange={(v) => setForm({ ...form, required: v })}
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={form.farmerEditable}
                    onCheckedChange={(v) => setForm({ ...form, farmerEditable: v })}
                  />
                  Farmer Editable
                </label>
              </div>
            </div>
          </div>

          {form.type === "category" && (
            <div className="p-4 bg-muted/30 rounded-xl space-y-3 border border-border/50">
              <Label className="font-bold">Dropdown Options</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Option (En)"
                  className="h-[48px] rounded-xl bg-card"
                  value={tempOptEn}
                  onChange={(e) => setTempOptEn(e.target.value)}
                />
                <Input
                  placeholder="विकल्प (Hi)"
                  className="h-[48px] rounded-xl bg-card"
                  value={tempOptHi}
                  onChange={(e) => setTempOptHi(e.target.value)}
                />
                <Button 
                  onClick={() => {
                    if(tempOptEn && tempOptHi) {
                      setForm({...form, optionsEn: [...(form.optionsEn||[]), tempOptEn], optionsHi: [...(form.optionsHi||[]), tempOptHi]});
                      setTempOptEn("");
                      setTempOptHi("");
                    }
                  }}
                  className="h-[48px] rounded-xl shrink-0"
                >
                  Add
                </Button>
              </div>
              {form.optionsEn?.map((opt, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-2 bg-card rounded border border-border">
                  <span>{opt} / {form.optionsHi?.[i]}</span>
                  <button className="text-destructive font-bold" onClick={() => {
                    setForm({
                      ...form, 
                      optionsEn: form.optionsEn?.filter((_, idx) => idx !== i),
                      optionsHi: form.optionsHi?.filter((_, idx) => idx !== i),
                    });
                  }}>Remove</button>
                </div>
              ))}
            </div>
          )}
          
          <Button className="w-full h-[52px] rounded-xl font-bold" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Plus className="mr-2 size-5" />}
            Add Question
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-4">
        {questions.sort((a,b) => a.order - b.order).map((q, i) => (
          <Card key={q.id} className="shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 flex gap-4">
              <div className="flex flex-col justify-center gap-1">
                <button
                  className="p-1 hover:bg-muted rounded"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  <ArrowUp className="size-4 text-muted-foreground" />
                </button>
                <button
                  className="p-1 hover:bg-muted rounded"
                  onClick={() => move(i, 1)}
                  disabled={i === questions.length - 1}
                >
                  <ArrowDown className="size-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-[16px]">{q.labelEn}</p>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                    {q.type}
                  </span>
                  {q.required && <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase">Required</span>}
                </div>
                <p className="text-[14px] text-muted-foreground">{q.labelHi}</p>
                {q.type === "category" && q.optionsEn && (
                  <p className="text-[12px] text-muted-foreground mt-2 bg-muted/50 p-2 rounded-lg truncate">
                    {q.optionsEn.join(", ")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 self-center text-destructive hover:bg-destructive/10 shrink-0"
                onClick={async () => {
                  if (window.confirm("Delete question?")) {
                    await deleteQuestion(q.id);
                    onChanged();
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
`;
fs.writeFileSync("generate_admin_7.js", content);
