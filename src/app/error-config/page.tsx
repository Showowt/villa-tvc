// ═══════════════════════════════════════════════════════════════
// TVC ENVIRONMENT CONFIGURATION DIAGNOSTIC PAGE
// Issue #82 — Admin-only page to debug missing env vars
// NO SECRETS DISPLAYED - Only yes/no status
// ═══════════════════════════════════════════════════════════════

import { runValidation, getEnvSummary } from "@/lib/validateEnv";
import { REQUIRED_ENV_VARS } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface EnvVarRowProps {
  name: string;
  description: string;
  configured: boolean;
  where: string;
  required: boolean;
}

function EnvVarRow({
  name,
  description,
  configured,
  where,
  required,
}: EnvVarRowProps) {
  return (
    <tr
      className={
        configured
          ? "bg-green-500/10"
          : required
            ? "bg-red-500/10"
            : "bg-yellow-500/10"
      }
    >
      <td className="px-4 py-3 font-mono text-sm">
        {name}
        {required && <span className="ml-2 text-red-400 text-xs">*</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{description}</td>
      <td className="px-4 py-3">
        {configured ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Configured
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 ${required ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"} rounded text-xs font-medium`}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            {required ? "Missing" : "Not Set"}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">{where}</td>
    </tr>
  );
}

interface ServiceStatusProps {
  name: string;
  configured: boolean;
  message: string;
}

function ServiceStatus({ name, configured, message }: ServiceStatusProps) {
  return (
    <div
      className={`p-4 rounded-lg border ${configured ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-white">{name}</span>
        {configured ? (
          <span className="text-green-400 text-sm">Active</span>
        ) : (
          <span className="text-red-400 text-sm">Inactive</span>
        )}
      </div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export default function ErrorConfigPage() {
  const validation = runValidation();

  // Log summary to server console
  console.log(getEnvSummary());

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            TVC Environment Configuration
          </h1>
          <p className="text-gray-400">
            Diagnostic page for checking environment variable status.
            <span className="text-yellow-400 ml-2">
              No secrets are displayed.
            </span>
          </p>
        </div>

        {/* Overall Status */}
        <div
          className={`p-6 rounded-xl border mb-8 ${
            validation.valid
              ? "border-green-500/50 bg-green-500/10"
              : "border-red-500/50 bg-red-500/10"
          }`}
        >
          <div className="flex items-center gap-4">
            {validation.valid ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-green-400">
                    Environment Configured
                  </h2>
                  <p className="text-gray-400">
                    All critical environment variables are set.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-400">
                    Configuration Required
                  </h2>
                  <p className="text-gray-400">
                    {validation.criticalMissing.length} critical variable(s)
                    missing.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Service Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ServiceStatus
              name="Supabase Database"
              configured={validation.services.supabase.configured}
              message={validation.services.supabase.message}
            />
            <ServiceStatus
              name="Anthropic Claude AI"
              configured={validation.services.anthropic.configured}
              message={validation.services.anthropic.message}
            />
            <ServiceStatus
              name="Twilio API"
              configured={validation.services.twilio.configured}
              message={validation.services.twilio.message}
            />
            <ServiceStatus
              name="WhatsApp Sender"
              configured={validation.services.whatsapp.configured}
              message={validation.services.whatsapp.message}
            />
            <ServiceStatus
              name="Weather API"
              configured={validation.services.weather.configured}
              message={validation.services.weather.message}
            />
            <ServiceStatus
              name="Cron Security"
              configured={validation.services.cron.configured}
              message={validation.services.cron.message}
            />
          </div>
        </div>

        {/* Critical Variables Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">
            Critical Variables{" "}
            <span className="text-red-400 text-sm font-normal">* Required</span>
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Variable
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Where to Get
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {REQUIRED_ENV_VARS.critical.map((envVar) => (
                  <EnvVarRow
                    key={envVar.key}
                    name={envVar.key}
                    description={envVar.description}
                    configured={
                      validation.services.supabase.configured ||
                      !validation.criticalMissing.includes(envVar.key)
                    }
                    where={envVar.where}
                    required={true}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Optional Variables Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Optional Variables</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Variable
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                    Where to Get
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {REQUIRED_ENV_VARS.optional.map((envVar) => (
                  <EnvVarRow
                    key={envVar.key}
                    name={envVar.key}
                    description={envVar.description}
                    configured={
                      !validation.optionalMissing.includes(envVar.key)
                    }
                    where={envVar.where}
                    required={false}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Errors */}
        {validation.errors.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-red-400">
              Validation Errors
            </h3>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <ul className="list-disc list-inside space-y-2">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-300">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Fix Instructions */}
        {!validation.valid && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">How to Fix</h3>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-cyan-400 mb-2">
                    Local Development
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>
                      Copy{" "}
                      <code className="px-1 py-0.5 bg-gray-700 rounded">
                        .env.example
                      </code>{" "}
                      to{" "}
                      <code className="px-1 py-0.5 bg-gray-700 rounded">
                        .env.local
                      </code>
                    </li>
                    <li>Fill in the missing values from the sources above</li>
                    <li>
                      Restart the development server:{" "}
                      <code className="px-1 py-0.5 bg-gray-700 rounded">
                        npm run dev
                      </code>
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium text-cyan-400 mb-2">
                    Vercel Deployment
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>
                      Go to{" "}
                      <span className="text-white">
                        Project Settings {">"} Environment Variables
                      </span>
                    </li>
                    <li>Add each missing variable</li>
                    <li>Redeploy from the Deployments tab</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-medium text-cyan-400 mb-2">Need Help?</h4>
                  <p className="text-sm text-gray-400">
                    Contact the development team or check the project
                    documentation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-12">
          <p>TVC Operations Environment Diagnostics</p>
          <p className="mt-1">This page does not display any secret values.</p>
        </div>
      </div>
    </div>
  );
}
