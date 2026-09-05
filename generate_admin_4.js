const fs = require("fs");
const content = `
  const { lang } = useI18n();
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{record.fullName}</h2>
        <StatusBadge status={record.status} />
      </div>

      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
          <CardTitle className="text-[16px] font-bold">Farmer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 p-4">
          {[
            ["Age", record.age],
            ["Gender", record.gender],
            ["Contact", record.contactNumber],
            ["Village", record.village],
            ["Tehsil", record.tehsil],
            ["District", record.district],
            ["State", record.state],
            ["Killahs", record.killahs],
            ["Lead Farmer?", record.isLeadFarmer ? "Yes" : "No"],
            ["Linked Lead", record.leadFarmerID ?? "-"],
            ["Supervisor", supervisorName],
          ].map(([l, v]) => (
            <div key={String(l)} className="space-y-1">
              <p className="text-[12px] font-medium text-muted-foreground">{l}</p>
              <p className="font-bold text-[14px]">{v === null || v === "" ? "-" : String(v)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
          <CardTitle className="text-[16px] font-bold">Survey Answers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {questions.map((q) => (
              <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4">
                <span className="text-[14px] text-muted-foreground font-medium">{lang === "hi" ? q.labelHi : q.labelEn}</span>
                <span className="font-bold text-[15px]">{String(record.answers?.[q.id] ?? "-")}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
          <CardTitle className="text-[16px] font-bold">Field Photos ({record.photos.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 p-4">
          {record.photos.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No photos captured.</p>}
          {record.photos.map((p, i) => (
            <div key={i} className="relative overflow-hidden rounded-xl border border-border shadow-sm aspect-square bg-muted">
              <img src={p.url} alt="Field" className="size-full object-cover" />
              {p.timestamp && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 backdrop-blur-sm">
                  <p className="text-[10px] text-white font-medium truncate">
                    {new Date(p.timestamp).toLocaleString()}
                  </p>
                  {p.location && (
                    <p className="text-[10px] text-white/80 truncate">
                      {p.location.latitude.toFixed(4)}, {p.location.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Button 
        variant="destructive" 
        className="w-full h-[52px] rounded-xl font-bold mt-4" 
        onClick={async () => {
          if (window.confirm("Delete this record permanently?")) {
            await deleteRecord(record.id);
            onClose();
          }
        }}
      >
        <Trash2 className="size-5 mr-2" /> Delete Record
      </Button>
    </div>
  );
}

function UserManagement({
  allUsers,
  records,
  createAccount,
  onChanged,
}: {
  allUsers: AppUser[];
  records: FarmerRecord[];
  createAccount: any;
  onChanged: () => void;
}) {
  const [role, setRole] = useState<"supervisor" | "farmer">("supervisor");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", farmerRecordId: "" });
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  async function submit() {
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill all required fields");
      return;
    }
    setBusy(true);
    try {
      await createAccount({ ...form, role });
      toast.success(role === "supervisor" ? "Supervisor created" : "Farmer created");
      setForm({ name: "", email: "", password: "", phone: "", farmerRecordId: "" });
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">User Management</h2>
      <div className="grid grid-cols-2 gap-4">
`;
fs.writeFileSync("generate_admin_4.js", content);
