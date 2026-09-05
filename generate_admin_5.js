const fs = require("fs");
const content = `
        <button
          onClick={() => setRole("supervisor")}
          className={\`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all \${
            role === "supervisor" 
              ? "border-primary bg-primary/10 shadow-sm" 
              : "border-border bg-card hover:bg-muted"
          }\`}
        >
          <Shield className={\`size-8 mb-2 \${role === "supervisor" ? "text-primary" : "text-muted-foreground"}\`} />
          <span className={\`font-bold \${role === "supervisor" ? "text-primary" : "text-muted-foreground"}\`}>Supervisor 🛡</span>
        </button>
        <button
          onClick={() => setRole("farmer")}
          className={\`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all \${
            role === "farmer" 
              ? "border-primary bg-primary/10 shadow-sm" 
              : "border-border bg-card hover:bg-muted"
          }\`}
        >
          <Tractor className={\`size-8 mb-2 \${role === "farmer" ? "text-primary" : "text-muted-foreground"}\`} />
          <span className={\`font-bold \${role === "farmer" ? "text-primary" : "text-muted-foreground"}\`}>Farmer 🚜</span>
        </button>
      </div>

      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-[18px]">Create New {role === "supervisor" ? "Supervisor" : "Farmer"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Input
              placeholder="Full Name / पूरा नाम *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-[52px] rounded-xl"
            />
            <Input
              placeholder="Email / ईमेल *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-[52px] rounded-xl"
            />
            <Input
              placeholder="Password / पासवर्ड *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="h-[52px] rounded-xl"
            />
            <Input
              placeholder="Contact / संपर्क (Optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-[52px] rounded-xl"
            />
            {role === "farmer" ? (
              <select
                className="h-[52px] w-full rounded-xl border border-border bg-card px-3 text-[14px]"
                value={form.farmerRecordId}
                onChange={(e) => setForm({ ...form, farmerRecordId: e.target.value })}
              >
                <option value="">None — Select linked farmer record (Optional)</option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} — {r.village}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <Button className="w-full h-[52px] rounded-xl text-base font-bold" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-5 animate-spin" /> : <UserPlus className="mr-2 size-5" />}
            Create {role === "supervisor" ? "Supervisor" : "Farmer"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-4">
        <h3 className="text-[18px] font-bold">Existing Users</h3>
        {allUsers.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
        {allUsers.map((u) => (
          <Card key={u.uid} className="shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[18px]">
                {u.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="truncate text-[16px] font-bold">{u.name}</p>
                  <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider \${
                    u.role === "supervisor" ? "bg-primary/15 text-primary" : "bg-blue-500/15 text-blue-600"
                  }\`}>
                    {u.role}
                  </span>
                </div>
                <p className="truncate text-[13px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                <Switch
                  checked={u.active !== false}
                  onCheckedChange={async (v) => {
                    await saveAppUser({ ...u, active: v });
                    onChanged();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (window.confirm("Delete user?")) {
                      await deleteAppUser(u.uid);
                      onChanged();
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuestionManagement({
  questions,
  onChanged,
}: {
  questions: SurveyQuestion[];
  onChanged: () => void;
}) {
`;
fs.writeFileSync("generate_admin_5.js", content);
