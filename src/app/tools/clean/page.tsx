import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListCleaner } from "@/components/cleaning/ListCleaner";
import { ListMerger } from "@/components/cleaning/ListMerger";
import { Wand2, Merge } from "lucide-react";

export const metadata = {
  title: "Email List Cleaning | Email Validator",
  description: "Clean, deduplicate, and merge email lists",
};

export default function CleanPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email List Cleaning</h1>
        <p className="text-muted-foreground mt-2">
          Clean, deduplicate, and merge your email lists
        </p>
      </div>

      <Tabs defaultValue="clean" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clean" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Clean List
          </TabsTrigger>
          <TabsTrigger value="merge" className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            Merge Lists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clean">
          <ListCleaner />
        </TabsContent>

        <TabsContent value="merge">
          <ListMerger />
        </TabsContent>
      </Tabs>
    </div>
  );
}
