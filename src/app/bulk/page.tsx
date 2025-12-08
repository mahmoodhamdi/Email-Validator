import { BulkValidator } from "@/components/email/BulkValidator";

export const metadata = {
  title: "Bulk Email Validation - Email Validator",
  description: "Validate multiple email addresses at once with CSV upload or text input",
};

export default function BulkPage() {
  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Bulk Email Validation
          </h1>
          <p className="text-lg text-muted-foreground">
            Validate multiple email addresses at once. Upload a CSV/TXT file or
            paste your email list.
          </p>
        </div>
        <BulkValidator />
      </div>
    </div>
  );
}
