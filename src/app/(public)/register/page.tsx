'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import styles from '../login/auth.module.css'

export default function RegisterPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lógica de validación en tiempo real
  const passwordValidation = useMemo(() => {
    const errors = [];
    if (password.length < 8) errors.push("Mínimo 8 caracteres");
    if (!/[A-Z]/.test(password)) errors.push("Una mayúscula");
    if (!/[a-z]/.test(password)) errors.push("Una minúscula");
    if (!/\d/.test(password)) errors.push("Un número");
    if (!/[@$!%*?&]/.test(password)) errors.push("Un símbolo (@$!%*?&)");
    return errors;
  }, [password]);

  const nameIsValid = useMemo(() => /^[a-zA-Z\s'-]+$/.test(fullName) || fullName === '', [fullName]);

  const isFormValid = passwordValidation.length === 0 && nameIsValid && email !== '' && fullName !== '';

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      setFormError("Por favor, corrige los errores en el formulario.");
      return;
    }
    setLoading(true);
    setFormError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setFormError(error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Bienvenido a AImpatfx</h2>
        <p className={styles.subtitle}>¡Vamos a crear tu cuenta!</p>
        
        <form onSubmit={handleSignUp} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="full_name" className={styles.label}>Nombre Completo</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`${styles.input} ${!nameIsValid && fullName ? styles.inputError : ''}`}
              placeholder="Introduce tu nombre y apellido"
              required
            />
            {!nameIsValid && fullName && <p className={styles.validationError}>Solo se permiten letras y espacios.</p>}
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="tu@email.com"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
            {password && passwordValidation.length > 0 && (
              <div className={styles.passwordValidation}>
                {passwordValidation.map(err => <span key={err}>- {err}</span>)}
              </div>
            )}
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading || !isFormValid}>
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
          
          {formError && <p className={styles.errorMessage}>{formError}</p>}
        </form>
        
        <div className={styles.authLinks}>
          <Link href="/login" className={styles.authLink}>
            ¿Ya tienes una cuenta? Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}




