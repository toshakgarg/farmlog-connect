const fs = require("fs");
const content = `
              {record.isLeadFarmer && (
                <Card className="bg-primary/10 border-primary/20 shadow-none">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Tractor className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-primary">You are a Lead Farmer.</p>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm rounded-xl">
                <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                  <CardTitle className="text-[16px] font-bold flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" /> Land Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">Village</p>
                    <p className="font-bold text-[15px]">{record.village || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">District</p>
                    <p className="font-bold text-[15px]">{record.district || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">Land Size</p>
                    <p className="font-bold text-[15px]">{record.killahs ?? 0} Killahs</p>
                  </div>
                </CardContent>
              </Card>

              {questions.length > 0 && (
                <Card className="shadow-sm rounded-xl">
                  <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-[16px] font-bold">Survey Answers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {questions.map((q) => (
                        <div key={q.id} className="flex justify-between items-center p-3 text-sm">
                          <span className="text-muted-foreground">{lang === "hi" ? q.labelHi : q.labelEn}</span>
                          <span className="font-bold">{String(record.answers?.[q.id] ?? "-")}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {record.photos.length > 0 && (
                <Card className="shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-[16px] font-bold">Field Photos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 p-4">
                    {record.photos.map((p, i) => (
                      <div key={i} className="relative overflow-hidden rounded-xl border border-border shadow-sm aspect-square bg-muted">
                        <img src={p.url} alt="Field" className="size-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
`;
fs.writeFileSync("generate_farmer_2.js", content);
