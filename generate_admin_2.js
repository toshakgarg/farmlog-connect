const fs = require("fs");
const content = `
  const supervisorName = (id) =>
    supervisors.find((s) => s.uid === id)?.name ?? "Unknown Supervisor";

  return (
    <AppShell 
      title={t("adminPanel") || "Admin Panel"} 
      subtitle={profile.name}
      onBack={detail ? () => setDetail(null) : undefined}
    >
      {detail ? (
        <RecordDetail
          record={detail}
          questions={questions}
          supervisorName={supervisorName(detail.supervisorID)}
          onClose={() => setDetail(null)}
        />
      ) : (
        <Tabs defaultValue="dashboard" className="pb-24">
          <TabsContent value="dashboard" className="space-y-6 mt-0">
            <h2 className="text-xl font-bold">Dashboard</h2>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Total Farmers" value={farmerUsers.length} icon={<Tractor className="size-5 text-primary" />} />
              <Stat label="Total Supervisors" value={supervisors.length} icon={<Shield className="size-5 text-primary" />} />
              <Stat label="Total Records" value={records.length} icon={<List className="size-5 text-primary" />} />
              <Stat label="Records This Month" value={records.filter(r => new Date(r.createdAt).getMonth() === new Date().getMonth()).length} icon={<CheckCircle2 className="size-5 text-primary" />} />
            </div>

            <Card className="shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-[18px] font-bold">Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {records.length === 0 && <div className="p-8 text-center text-muted-foreground">No records yet.</div>}
                  {records
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .slice(0, 5)
                    .map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDetail(r)}
                        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[16px] font-bold text-foreground">{r.fullName}</p>
                          <p className="truncate text-[13px] text-muted-foreground mt-0.5">
                            {r.village} · {supervisorName(r.supervisorID)} · {new Date(r.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-0">
            <UserManagement
              allUsers={[...supervisors, ...farmerUsers]}
              records={records}
              createAccount={createAccount}
              onChanged={refresh}
            />
          </TabsContent>

          <TabsContent value="records" className="space-y-4 mt-0">
            <h2 className="text-xl font-bold">Farmer Records</h2>
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-[16px]">Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Search by Village..."
                  className="h-[52px] rounded-xl"
                  value={filters.village}
                  onChange={(e) => setFilters({ ...filters, village: e.target.value })}
                />
                <select
                  className="h-[52px] rounded-xl border border-border bg-card px-3 text-[14px]"
                  value={filters.supervisor}
                  onChange={(e) => setFilters({ ...filters, supervisor: e.target.value })}
                >
                  <option value="">All Supervisors</option>
                  {supervisors.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    className="h-[52px] rounded-xl flex-1"
                    value={filters.from}
                    onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  />
                  <Input
                    type="date"
                    className="h-[52px] rounded-xl flex-1"
                    value={filters.to}
                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
`;
fs.writeFileSync("generate_admin_2.js", content);
