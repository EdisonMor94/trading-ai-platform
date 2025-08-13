'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { useTheme } from '../ThemeContext'; // Importamos el hook del tema
import styles from './settings.module.css'

// Interfaz para el perfil del usuario
interface Profile {
  full_name: string;
}

export default function SettingsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { theme, setTheme } = useTheme(); // Usamos el hook para obtener y cambiar el tema
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para los formularios de actualización
  const [fullName, setFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados para los mensajes de feedback
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error al obtener el perfil:", error);
        } else {
          setProfile(data);
          setFullName(data.full_name || ''); // Inicializa el campo del formulario
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    if (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el nombre: ' + error.message });
    } else {
      setMessage({ type: 'success', text: '¡Nombre actualizado correctamente!' });
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el email: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Se ha enviado un enlace de confirmación a tu nuevo correo.' });
      setNewEmail('');
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ type: 'error', text: 'Error al actualizar la contraseña: ' + error.message });
    } else {
      setMessage({ type: 'success', text: '¡Contraseña actualizada correctamente!' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  if (loading) {
    return <p>Cargando configuración...</p>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Configuración de la Cuenta</h1>
        <p className={styles.headerSubtitle}>Administra tu información personal y tus preferencias.</p>
      </header>

      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
          {message.text}
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Apariencia</h2>
        <div className={styles.themeSelector}>
          <p className={styles.label}>Tema de la aplicación</p>
          <div className={styles.billingToggle}>
            <span>Claro</span>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={theme === 'dark'}
                onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
              />
              <span className={styles.slider}></span>
            </label>
            <span>Oscuro</span>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Información del Perfil</h2>
        <form onSubmit={handleNameUpdate} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName" className={styles.label}>Nombre Completo</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button}>Actualizar Nombre</button>
        </form>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Seguridad</h2>
        <form onSubmit={handleEmailUpdate} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="newEmail" className={styles.label}>Actualizar Email</label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={styles.input}
              placeholder="nuevo@email.com"
            />
          </div>
          <button type="submit" className={styles.button}>Actualizar Email</button>
        </form>
        <hr className={styles.divider} />
        <form onSubmit={handlePasswordUpdate} className={styles.form}>
           <div className={styles.formGroup}>
            <label htmlFor="newPassword" className={styles.label}>Nueva Contraseña</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirmar Nueva Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              placeholder="Repite la contraseña"
            />
          </div>
          <button type="submit" className={styles.button}>Actualizar Contraseña</button>
        </form>
      </div>
    </div>
  );
}





