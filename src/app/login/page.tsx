"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Building2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Estados formulario
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  // Estados Captcha
  const [captchaSvg, setCaptchaSvg] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [loadingCaptcha, setLoadingCaptcha] = useState(true);

  // Estados 2FA
  const [step, setStep] = useState<"CREDENTIALS" | "2FA">("CREDENTIALS");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [previewCode, setPreviewCode] = useState("");

  // Feedback y loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar Captcha dinámico
  const fetchCaptcha = async () => {
    try {
      setLoadingCaptcha(true);
      setCaptchaAnswer("");
      const res = await fetch("/api/auth/captcha");
      const data = await res.json();
      if (data.success) {
        setCaptchaSvg(data.svg);
        setCaptchaToken(data.token);
      }
    } catch (err) {
      console.error("Error al cargar captcha:", err);
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    fetchCaptcha();
  }, []);

  // Manejo Paso 1: Credenciales + Captcha
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailOrUser.trim() || !password.trim()) {
      setError("Complete su usuario y contraseña institucional.");
      return;
    }

    if (!captchaAnswer.trim()) {
      setError("Por favor ingrese el código Captcha de la imagen.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_or_user: emailOrUser.trim(),
          password,
          captcha_token: captchaToken,
          captcha_answer: captchaAnswer.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al verificar credenciales");
        // Si falló el captcha o credenciales, refrescar captcha
        fetchCaptcha();
        return;
      }

      if (data.require2FA) {
        setTwoFactorToken(data.twoFactorToken);
        setMaskedEmail(data.maskedEmail);
        setPreviewCode(data.previewCode);
        setStep("2FA");
        setTwoFactorCode(data.previewCode); // Prellenado de cortesía para pruebas ágiles
      } else {
        router.push("/escritorio");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor institucional.");
    } finally {
      setLoading(false);
    }
  };

  // Manejo Paso 2: Doble Factor (2FA)
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!twoFactorCode.trim() || twoFactorCode.length < 6) {
      setError("Ingrese el código de 6 dígitos enviado a su correo institucional.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_2FA",
          twoFactorToken,
          code: twoFactorCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Código de verificación 2FA inválido");
        return;
      }

      // Redirigir a la bandeja de trabajo
      router.push("/escritorio");
    } catch (err: any) {
      setError(err.message || "Error al validar código de doble factor.");
    } finally {
      setLoading(false);
    }
  };

  // Cuentas demo para pruebas rápidas del usuario y sus directivos
  const demoUsers = [
    { label: "Directora DFI", user: "directora.dfi@aduana.gob.ec" },
    { label: "Secretaria DFI", user: "secretaria.dfi@aduana.gob.ec" },
    { label: "Jefe Presupuesto", user: "jefe.presupuesto@aduana.gob.ec" },
    { label: "Analista Presupuesto", user: "analista.presupuesto1@aduana.gob.ec" },
    { label: "Contador General", user: "contador.general@aduana.gob.ec" },
    { label: "Administrador", user: "admin@aduana.gob.ec" },
  ];

  const handleSelectDemo = (u: string) => {
    setEmailOrUser(u);
    setPassword("senae2026");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Fondo de seguridad GovTech */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 space-y-6">
        {/* Membrete Institucional */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-sans">
            Servicio Nacional de Aduana del Ecuador
          </h1>
          <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
            Dirección Financiera · Control Previo al Pago v2.0
          </p>
        </div>

        {/* Tarjeta de Autenticación */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 space-y-6">
          {/* Header con Badges de Seguridad */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase">
                {step === "CREDENTIALS" ? "Acceso Institucional" : "Validación de Doble Factor (2FA)"}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {step === "CREDENTIALS"
                  ? "Ingrese sus credenciales y resuelva el desafío de seguridad."
                  : "Ingrese el código de un solo uso enviado a su correo."}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TLS 256-bit</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* PASO 1: USUARIO, CONTRASEÑA Y CAPTCHA                     */}
          {/* ======================================================== */}
          {step === "CREDENTIALS" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Usuario o Correo Institucional *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={emailOrUser}
                    onChange={(e) => setEmailOrUser(e.target.value)}
                    placeholder="ej. directora.dfi@aduana.gob.ec"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Contraseña Institucional *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-2.5 top-2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* BLOQUE DE CAPTCHA VISUAL */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                    Desafío de Seguridad (Captcha) *
                  </span>
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    disabled={loadingCaptcha}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
                    title="Generar nueva imagen"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingCaptcha ? "animate-spin" : ""}`} />
                    Recargar imagen
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Imagen SVG del Captcha */}
                  <div
                    className="bg-white border border-slate-300 rounded-lg overflow-hidden shrink-0 shadow-2xs"
                    dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  />

                  {/* Input del Captcha */}
                  <div className="flex-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                      placeholder="Ingrese código..."
                      className="w-full py-2 px-3 text-xs uppercase font-mono tracking-wider font-bold bg-white border border-slate-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Continuar al Doble Factor (2FA)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* PASO 2: CÓDIGO DE DOBLE FACTOR (2FA)                      */}
          {/* ======================================================== */}
          {step === "2FA" && (
            <form onSubmit={handle2FASubmit} className="space-y-5 animate-in fade-in">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>Código de Autenticación 2FA</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Por política institucional de seguridad, se ha generado un código de 6 dígitos
                  asociado a la cuenta <strong>{maskedEmail}</strong>.
                </p>

                {previewCode && (
                  <div className="mt-2 p-2 bg-white rounded border border-blue-300 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">Código generado (demo):</span>
                    <span className="font-mono font-bold text-blue-800 tracking-widest text-sm">
                      {previewCode}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 text-center">
                  Ingrese el código de 6 dígitos *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full py-3 px-4 text-lg font-mono font-bold tracking-widest text-slate-900 bg-slate-50 border border-slate-300 rounded-xl text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validando código 2FA...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Validar y Acceder a la Bandeja</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("CREDENTIALS");
                    setError(null);
                    fetchCaptcha();
                  }}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  ← Volver a ingresar credenciales
                </button>
              </div>
            </form>
          )}

          {/* Selector de cuentas demo */}
          {step === "CREDENTIALS" && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Acceso Rápido para Pruebas Institucionales (Clave: senae2026):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {demoUsers.map((d) => (
                  <button
                    key={d.user}
                    type="button"
                    onClick={() => handleSelectDemo(d.user)}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded text-[10px] font-medium transition-colors"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500">
          Gobierno de la República del Ecuador · Servicio Nacional de Aduana del Ecuador (SENAE)
        </p>
      </div>
    </div>
  );
}
