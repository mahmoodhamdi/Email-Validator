import enMessages from "../../../messages/en.json";
import arMessages from "../../../messages/ar.json";

// These tests verify the translation files directly without needing next-intl runtime

describe("Internationalization", () => {
  describe("Translation Files Structure", () => {
    test("English translations are complete", () => {
      expect(enMessages.common.appName).toBe("Email Validator");
      expect(enMessages.home.title).toBe("Email Validator");
      expect(enMessages.nav.home).toBe("Home");
      expect(enMessages.nav.bulk).toBe("Bulk Validation");
      expect(enMessages.nav.history).toBe("History");
      expect(enMessages.nav.apiDocs).toBe("API Docs");
      expect(enMessages.validation.valid).toBe("Valid");
      expect(enMessages.validation.invalid).toBe("Invalid");
    });

    test("Arabic translations are complete", () => {
      expect(arMessages.common.appName).toBe("مدقق البريد الإلكتروني");
      expect(arMessages.home.title).toBe("مدقق البريد الإلكتروني");
      expect(arMessages.nav.home).toBe("الرئيسية");
      expect(arMessages.nav.bulk).toBe("التحقق الجماعي");
      expect(arMessages.nav.history).toBe("السجل");
      expect(arMessages.nav.apiDocs).toBe("وثائق API");
      expect(arMessages.validation.valid).toBe("صالح");
      expect(arMessages.validation.invalid).toBe("غير صالح");
    });

    test("All translation keys match between languages", () => {
      const getKeys = (
        obj: Record<string, unknown>,
        prefix = ""
      ): string[] => {
        return Object.entries(obj).flatMap(([key, value]) => {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === "object" && value !== null) {
            return getKeys(value as Record<string, unknown>, newKey);
          }
          return [newKey];
        });
      };

      const enKeys = getKeys(enMessages).sort();
      const arKeys = getKeys(arMessages).sort();

      expect(enKeys).toEqual(arKeys);
    });
  });

  describe("Common Translations", () => {
    test("common action words are translated", () => {
      expect(enMessages.common.save).toBe("Save");
      expect(arMessages.common.save).toBe("حفظ");

      expect(enMessages.common.cancel).toBe("Cancel");
      expect(arMessages.common.cancel).toBe("إلغاء");

      expect(enMessages.common.delete).toBe("Delete");
      expect(arMessages.common.delete).toBe("حذف");

      expect(enMessages.common.loading).toBe("Loading...");
      expect(arMessages.common.loading).toBe("جاري التحميل...");
    });
  });

  describe("Error Messages", () => {
    test("error messages are translated", () => {
      expect(enMessages.errors.required).toBe("This field is required");
      expect(arMessages.errors.required).toBe("هذا الحقل مطلوب");

      expect(enMessages.errors.invalidEmail).toBe(
        "Please enter a valid email address"
      );
      expect(arMessages.errors.invalidEmail).toBe(
        "يرجى إدخال عنوان بريد إلكتروني صالح"
      );

      expect(enMessages.errors.networkError).toBe(
        "Network error. Please try again."
      );
      expect(arMessages.errors.networkError).toBe(
        "خطأ في الشبكة. يرجى المحاولة مرة أخرى."
      );
    });
  });

  describe("Feature Descriptions", () => {
    test("feature names are translated", () => {
      expect(enMessages.features.syntaxCheck).toBe("Syntax Check");
      expect(arMessages.features.syntaxCheck).toBe("فحص الصيغة");

      expect(enMessages.features.domainVerification).toBe("Domain Verification");
      expect(arMessages.features.domainVerification).toBe("التحقق من النطاق");

      expect(enMessages.features.mxRecords).toBe("MX Records");
      expect(arMessages.features.mxRecords).toBe("سجلات MX");
    });

    test("feature descriptions are translated", () => {
      expect(enMessages.features.syntaxCheckDesc).toBe(
        "RFC 5322 compliant email format validation"
      );
      expect(arMessages.features.syntaxCheckDesc).toBe(
        "تحقق من صيغة البريد الإلكتروني وفقاً لمعيار RFC 5322"
      );
    });
  });

  describe("Validation Messages", () => {
    test("deliverability statuses are translated", () => {
      expect(enMessages.validation.deliverable).toBe("Deliverable");
      expect(arMessages.validation.deliverable).toBe("قابل للتسليم");

      expect(enMessages.validation.undeliverable).toBe("Undeliverable");
      expect(arMessages.validation.undeliverable).toBe("غير قابل للتسليم");
    });

    test("risk levels are translated", () => {
      expect(enMessages.validation.low).toBe("Low");
      expect(arMessages.validation.low).toBe("منخفض");

      expect(enMessages.validation.medium).toBe("Medium");
      expect(arMessages.validation.medium).toBe("متوسط");

      expect(enMessages.validation.high).toBe("High");
      expect(arMessages.validation.high).toBe("مرتفع");
    });

    test("validation check types are translated", () => {
      expect(enMessages.validation.syntax).toBe("Syntax");
      expect(arMessages.validation.syntax).toBe("الصيغة");

      expect(enMessages.validation.domain).toBe("Domain");
      expect(arMessages.validation.domain).toBe("النطاق");

      expect(enMessages.validation.mx).toBe("MX Records");
      expect(arMessages.validation.mx).toBe("سجلات MX");

      expect(enMessages.validation.disposable).toBe("Disposable");
      expect(arMessages.validation.disposable).toBe("مؤقت");
    });
  });

  describe("Navigation Labels", () => {
    test("all navigation items are translated", () => {
      const navKeys = ["home", "bulk", "history", "apiDocs", "analytics"];

      navKeys.forEach((key) => {
        expect(
          enMessages.nav[key as keyof typeof enMessages.nav]
        ).toBeDefined();
        expect(
          arMessages.nav[key as keyof typeof arMessages.nav]
        ).toBeDefined();
      });
    });
  });

  describe("Page Titles", () => {
    test("page titles are translated", () => {
      expect(enMessages.bulk.title).toBe("Bulk Email Validation");
      expect(arMessages.bulk.title).toBe("التحقق الجماعي من البريد الإلكتروني");

      expect(enMessages.history.title).toBe("Validation History");
      expect(arMessages.history.title).toBe("سجل التحقق");

      expect(enMessages.apiDocs.title).toBe("API Documentation");
      expect(arMessages.apiDocs.title).toBe("وثائق API");

      expect(enMessages.analytics.title).toBe("Analytics Dashboard");
      expect(arMessages.analytics.title).toBe("لوحة التحليلات");
    });
  });

  describe("Footer Content", () => {
    test("footer content is translated", () => {
      expect(enMessages.footer.tagline).toBe(
        "Professional email validation tool"
      );
      expect(arMessages.footer.tagline).toBe(
        "أداة احترافية للتحقق من البريد الإلكتروني"
      );

      expect(enMessages.footer.privacy).toBe("Privacy Policy");
      expect(arMessages.footer.privacy).toBe("سياسة الخصوصية");

      expect(enMessages.footer.terms).toBe("Terms of Service");
      expect(arMessages.footer.terms).toBe("شروط الخدمة");
    });
  });
});
