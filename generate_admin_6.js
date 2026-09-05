const fs = require("fs");
const content = `
  const [form, setForm] = useState<Partial<SurveyQuestion>>({
    labelEn: "",
    labelHi: "",
    type: "text",
    required: false,
    farmerEditable: true,
    optionsEn: [],
    optionsHi: [],
  });
  const [busy, setBusy] = useState(false);
  const [tempOptEn, setTempOptEn] = useState("");
  const [tempOptHi, setTempOptHi] = useState("");

  const move = async (index: number, dir: -1 | 1) => {
    if (index + dir < 0 || index + dir >= questions.length) return;
    const a = questions[index];
    const b = questions[index + dir];
    const t = a.order;
    a.order = b.order;
    b.order = t;
    await saveQuestion(a);
    await saveQuestion(b);
    onChanged();
  };

  const submit = async () => {
    if (!form.labelEn || !form.labelHi) {
      toast.error("Labels are required");
      return;
    }
    setBusy(true);
    try {
      await saveQuestion({
        id: newLocalId(),
        labelEn: form.labelEn,
        labelHi: form.labelHi,
        type: form.type as QuestionType,
        required: form.required ?? false,
        farmerEditable: form.farmerEditable ?? true,
        order: questions.length,
        optionsEn: form.optionsEn,
        optionsHi: form.optionsHi,
      });
      toast.success("Question added");
      setForm({
        labelEn: "",
        labelHi: "",
        type: "text",
        required: false,
        farmerEditable: true,
        optionsEn: [],
        optionsHi: [],
      });
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Survey Questions</h2>
      
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-[18px]">Add New Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Question Text (English)"
            value={form.labelEn}
            onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
            className="h-[52px] rounded-xl"
          />
          <Input
            placeholder="प्रश्न (Hindi)"
            value={form.labelHi}
            onChange={(e) => setForm({ ...form, labelHi: e.target.value })}
            className="h-[52px] rounded-xl"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Answer Type</Label>
              <select
                className="h-[52px] w-full rounded-xl border border-border bg-card px-3"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}
              >
                <option value="text">Text (Short Answer)</option>
                <option value="number">Number</option>
                <option value="category">Category (Dropdown)</option>
              </select>
            </div>
`;
fs.writeFileSync("generate_admin_6.js", content);
