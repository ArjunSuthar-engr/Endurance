const DEFAULT_APP_ENV = "development";
const isNodeProduction = process.env.NODE_ENV === "production";

type AppEnv = "development" | "staging" | "production";
type VerificationMode = "async" | "sync";

type ServerConfig = {
  nodeEnv: string;
  appEnv: AppEnv;
  siteUrl: string;
  authBackend: string;
  verificationMode: VerificationMode;
  verificationTargetMs: number;
  maxFileSizeBytes: number;
  minFileSizeBytes: number;
  supportedDocumentTypes: string[];
  sessionTimeoutSeconds: number;
  rateLimitPerMinute: number;
  security: {
    requireHttps: boolean;
    session: {
      name: string;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAgeSeconds: number;
    };
    cspEnabled: boolean;
  };
  firebase: {
    public: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      storageBucket: string;
      messagingSenderId: string;
      appId: string;
    };
    admin: {
      projectId: string;
      clientEmail: string;
      privateKey: string;
      storageBucket: string;
      bucketRegion: string;
    };
  };
};

function isAppEnv(value: string): value is AppEnv {
  return value === "development" || value === "staging" || value === "production";
}

function isVerificationMode(value: string): value is VerificationMode {
  return value === "async" || value === "sync";
}

function readRequiredEnvironmentValue(name: string, requiredInProduction: boolean) {
  const value = process.env[name];

  if (!requiredInProduction || !isNodeProduction) {
    return value ?? "";
  }

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseNumber(name: string, value: string | undefined, minimum?: number) {
  if (!value) {
    if (minimum !== undefined) {
      return minimum;
    }

    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || (minimum !== undefined && parsed < minimum)) {
    throw new Error(`Environment variable ${name} must be a number${minimum !== undefined ? ` >= ${minimum}` : ""}`);
  }

  return parsed;
}

function parseBoolean(name: string, value: string | undefined, fallback: boolean) {
  if (!value) {
    return fallback;
  }

  const normalized = value.toLowerCase();
  if (normalized === "1" || normalized === "true") {
    return true;
  }

  if (normalized === "0" || normalized === "false") {
    return false;
  }

  throw new Error(`Environment variable ${name} must be a boolean`);
}

function parseList(name: string, value: string | undefined, fallback: string[]) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const nodeEnv = (process.env.NODE_ENV as "development" | "production" | "test") ?? "development";
const appEnvRaw = process.env.APP_ENV ?? DEFAULT_APP_ENV;
const appEnv = isAppEnv(appEnvRaw) ? appEnvRaw : "development";
const verificationModeRaw = process.env.VERIFICATION_MODE ?? "async";
const verificationMode = isVerificationMode(verificationModeRaw) ? verificationModeRaw : "async";
const isProduction = appEnv === "production" || nodeEnv === "production";

const maxFileSizeBytes = parseNumber("MAX_FILE_SIZE_BYTES", readRequiredEnvironmentValue("MAX_FILE_SIZE_BYTES", isProduction), 1);
const minFileSizeBytes = parseNumber("MIN_FILE_SIZE_BYTES", readRequiredEnvironmentValue("MIN_FILE_SIZE_BYTES", isProduction), 1);

if (minFileSizeBytes >= maxFileSizeBytes) {
  throw new Error("MIN_FILE_SIZE_BYTES must be lower than MAX_FILE_SIZE_BYTES");
}

export const serverConfig: ServerConfig = {
  nodeEnv,
  appEnv,
  siteUrl: readRequiredEnvironmentValue("NEXT_PUBLIC_SITE_URL", isProduction),
  authBackend: readRequiredEnvironmentValue("AUTH_BACKEND", isProduction),
  verificationMode,
  verificationTargetMs: parseNumber(
    "VERIFICATION_TARGET_MS",
    readRequiredEnvironmentValue("VERIFICATION_TARGET_MS", isProduction),
    1
  ),
  maxFileSizeBytes,
  minFileSizeBytes,
  supportedDocumentTypes: parseList(
    "SUPPORTED_DOCUMENT_TYPES",
    readRequiredEnvironmentValue("SUPPORTED_DOCUMENT_TYPES", false),
    ["application/pdf", "image/jpeg", "image/png"]
  ),
  sessionTimeoutSeconds: parseNumber("SESSION_TTL_SECONDS", readRequiredEnvironmentValue("SESSION_TTL_SECONDS", isProduction), 60),
  rateLimitPerMinute: parseNumber("API_RATE_LIMIT_RPM", readRequiredEnvironmentValue("API_RATE_LIMIT_RPM", false), 1),
  security: {
    requireHttps: parseBoolean("FORCE_HTTPS", process.env.FORCE_HTTPS, isNodeProduction),
    session: {
      name: process.env.SESSION_COOKIE_NAME ?? "endurance_session",
      secure: parseBoolean("SESSION_COOKIE_SECURE", process.env.SESSION_COOKIE_SECURE, isNodeProduction),
      sameSite: "lax",
      path: "/",
      maxAgeSeconds: parseNumber("SESSION_TTL_SECONDS", readRequiredEnvironmentValue("SESSION_TTL_SECONDS", isProduction), 60),
    },
    cspEnabled: parseBoolean("SECURITY_CSP_ENABLED", process.env.SECURITY_CSP_ENABLED, true),
  },
  firebase: {
    public: {
      apiKey: readRequiredEnvironmentValue("NEXT_PUBLIC_FIREBASE_API_KEY", isProduction),
      authDomain: readRequiredEnvironmentValue("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", isProduction),
      projectId: readRequiredEnvironmentValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID", isProduction),
      storageBucket: readRequiredEnvironmentValue("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", isProduction),
      messagingSenderId: readRequiredEnvironmentValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", isProduction),
      appId: readRequiredEnvironmentValue("NEXT_PUBLIC_FIREBASE_APP_ID", isProduction),
    },
    admin: {
      projectId: readRequiredEnvironmentValue("FIREBASE_PROJECT_ID", isProduction),
      clientEmail: readRequiredEnvironmentValue("FIREBASE_CLIENT_EMAIL", isProduction),
      privateKey: readRequiredEnvironmentValue("FIREBASE_PRIVATE_KEY", isProduction).replace(/\\n/g, "\n"),
      storageBucket: readRequiredEnvironmentValue("FIREBASE_STORAGE_BUCKET", isProduction),
      bucketRegion: process.env.FIREBASE_BUCKET_REGION ?? "us-central1",
    },
  },
};
