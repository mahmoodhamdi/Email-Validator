import { EmailValidator } from "@/components/email/EmailValidator";

export default function Home() {
  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Email Validator
          </h1>
          <p className="text-lg text-muted-foreground">
            Validate email addresses instantly with comprehensive checks including
            syntax validation, domain verification, MX record lookup, and more.
          </p>
        </div>
        <EmailValidator />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Syntax Check"
            description="RFC 5322 compliant email format validation"
          />
          <FeatureCard
            title="Domain Verification"
            description="Check if the email domain exists and is valid"
          />
          <FeatureCard
            title="MX Records"
            description="Verify mail server existence via MX record lookup"
          />
          <FeatureCard
            title="Disposable Detection"
            description="Identify temporary and throwaway email addresses"
          />
          <FeatureCard
            title="Role-Based Check"
            description="Detect role-based emails like admin@ or support@"
          />
          <FeatureCard
            title="Typo Suggestions"
            description="Get correction suggestions for common domain typos"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
