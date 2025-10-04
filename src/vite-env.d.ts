interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly SC_GA_MEASUREMENT_ID: string;
  readonly SC_GA_MEASUREMENT_API_SECRET: string;
  readonly SC_SUPPORT_LINK: string;
  readonly SC_BROWSER_TOOLBAR_DIRECTIONALITY: 'right' | 'left';
  readonly SC_WELCOME_PAGE_LINK: string;
  readonly SC_PRIVACY_POLICY_LINK: string;
  readonly SC_MARKET_ITEM_LINK: string;
  readonly SC_REPORT_ISSUE_LINK: string;
  readonly SC_SEND_FEEDBACK_LINK: string;
  readonly SC_GOODBYE_LINK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
