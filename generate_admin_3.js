const fs = require("fs");
const content = `
            <Button
              variant="secondary"
              className="w-full h-[52px] rounded-xl shadow-sm text-base font-bold bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() =>
                downloadCsv(\`farmlog-\${Date.now()}.csv\`, recordsToCsv(filtered, questions))
              }
            >
              <Download className="mr-2 size-5" /> Export All (CSV)
            </Button>
            
            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-center p-8 text-muted-foreground bg-muted/30 rounded-xl">No records match your filters.</div>
              )}
              {filtered.map((r) => (
                <Card key={r.id} className="shadow-sm rounded-xl overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full flex-col p-4 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
                    onClick={() => setDetail(r)}
                  >
                    <div className="flex justify-between items-start mb-2 w-full">
                      <p className="font-bold text-[18px]">{r.fullName}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-[14px] text-muted-foreground flex items-center gap-1.5 mb-1">
                      <MapPin className="size-4" /> {r.village}
                    </p>
                    <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                      <Shield className="size-4" /> {supervisorName(r.supervisorID)}
                    </p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-[12px] font-medium">
                      <span>{r.killahs ?? 0} Killahs</span>
                      <span>•</span>
                      <span>{r.photos.length} Photos</span>
                      <span>•</span>
                      <span>{new Date(r.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 mt-0">
            <QuestionManagement questions={questions} onChanged={refresh} />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] rounded-none border-t border-border bg-card p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] justify-around pb-safe text-muted-foreground">
            <TabsTrigger value="dashboard" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <Home className="size-6" />
              <span className="text-[10px] font-medium leading-none">Home</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <Users className="size-6" />
              <span className="text-[10px] font-medium leading-none">Users</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <List className="size-6" />
              <span className="text-[10px] font-medium leading-none">Records</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <Settings className="size-6" />
              <span className="text-[10px] font-medium leading-none">Survey</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </AppShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm rounded-xl border-border bg-card">
      <CardContent className="p-4 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">{icon}</div>
        <p className="text-3xl font-extrabold text-foreground">{value}</p>
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function RecordDetail({
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
`;
fs.writeFileSync("generate_admin_3.js", content);
