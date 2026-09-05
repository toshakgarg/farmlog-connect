const fs = require("fs");
const content = `
        <TabsContent value="profile" className="space-y-4 mt-0">
          <Card className="shadow-sm rounded-xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
                {profile?.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold">{profile?.name}</h3>
                <p className="text-muted-foreground">{profile?.email}</p>
                <p className="text-xs font-semibold uppercase mt-1 text-primary">{profile?.role}</p>
              </div>
            </CardContent>
          </Card>

          {record && editable.length > 0 ? (
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-[16px] font-bold">{t("updateAnswers") || "Update Answers"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <QuestionFields
                  questions={editable}
                  answers={answers}
                  onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                />
                <Button className="w-full h-[52px] rounded-xl font-bold shadow-md" onClick={save} disabled={saving}>
                  {t("save") || "Save Updates"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-sm rounded-xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Language</span>
                <LanguageToggle />
              </div>
              <Button 
                variant="destructive" 
                className="w-full h-[52px] rounded-xl font-bold"
                onClick={async () => {
                  await logout();
                  navigate({ to: "/" });
                }}
              >
                Log out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsList className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] rounded-none border-t border-border bg-card p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] justify-around pb-safe text-muted-foreground">
          <TabsTrigger value="home" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
            <Home className="size-6" />
            <span className="text-[10px] font-medium leading-none">Home</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
            <User className="size-6" />
            <span className="text-[10px] font-medium leading-none">Profile</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </AppShell>
  );
}
`;
fs.writeFileSync("generate_farmer_3.js", content);
