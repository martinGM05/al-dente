<script lang="ts">
	import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { auth } from '#lib/firebase.js';

	let { onclose, required = false }: { onclose: () => void; required?: boolean } = $props();
	let errorMessage = $state('');
	let isLoading = $state(false);

	function readableError(error: unknown) {
		const code = error instanceof Error ? error.message : '';
		if (code.includes('auth/popup-closed-by-user')) return 'Cerraste la ventana de Google antes de terminar.';
		if (code.includes('auth/popup-blocked')) return 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.';
		if (code.includes('auth/operation-not-allowed')) return 'El acceso con Google no está activado en Firebase.';
		return 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.';
	}

	async function authenticateWithGoogle() {
		errorMessage = '';
		if (!auth) {
			errorMessage = 'Añade la configuración de Firebase para activar el acceso con Google.';
			return;
		}
		isLoading = true;
		try {
			await signInWithPopup(auth, new GoogleAuthProvider());
			onclose();
		} catch (error) {
			errorMessage = readableError(error);
		} finally {
			isLoading = false;
		}
	}
</script>

<section class="auth-entry" aria-labelledby="auth-title">
	<div class="auth-entry__content">
		<header class="auth-entry__header">
			<a class="auth-entry__brand" href="/" aria-label="Al dente, inicio">al dente<span>•</span></a>
			{#if !required}
				<button class="auth-entry__close" type="button" onclick={onclose}>Ahora no</button>
			{/if}
		</header>

		<main class="auth-entry__main">
			<h1 id="auth-title">Organizá tu semana.</h1>
			<p class="auth-entry__copy">Planificá comidas y compras en minutos.</p>
			<div class="auth-entry__action">
				<button class="auth-entry__google" type="button" onclick={authenticateWithGoogle} disabled={isLoading}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.4h3.2c1.9-1.8 3-4.3 3-7.1Z" /><path fill="#34a853" d="M12 22c2.7 0 5-0.9 6.6-2.5l-3.2-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.5A10 10 0 0 0 12 22Z" /><path fill="#fbbc05" d="M6.4 14a6 6 0 0 1 0-3.9V7.6H3.1a10 10 0 0 0 0 8.8L6.4 14Z" /><path fill="#ea4335" d="M12 5.9c1.5 0 2.9.5 4 1.6l3-3A10 10 0 0 0 3.1 7.6l3.3 2.5C7.2 7.6 9.4 5.9 12 5.9Z" /></svg>
					<span>{isLoading ? 'Abriendo Google…' : 'Continuar con Google'}</span>
				</button>
				{#if errorMessage}<p class="auth-entry__error" role="alert">{errorMessage}</p>{/if}
			</div>
		</main>

		<footer class="auth-entry__footer">
			<p class="auth-entry__note">Tu plan se guarda de forma privada en tu cuenta.</p>
		</footer>
	</div>
</section>

<style>
	:global(body) { background: #f8f7f3; }

	.auth-entry {
		min-height: 100dvh;
		background: #f8f7f3;
		color: #24332b;
	}

	.auth-entry__content {
		display: grid;
		min-height: 100dvh;
		max-width: 480px;
		margin: 0 auto;
		grid-template-rows: auto 1fr auto;
		padding: max(20px, env(safe-area-inset-top)) 24px max(20px, env(safe-area-inset-bottom));
	}

	.auth-entry__header {
		position: static;
		z-index: auto;
		display: flex;
		height: auto;
		align-items: center;
		justify-content: space-between;
		background: transparent;
		box-shadow: none;
	}

	.auth-entry__brand {
		color: #254634;
		font-family: 'DM Sans', sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		text-decoration: none;
	}

	.auth-entry__brand span { color: #e17a50; }
	.auth-entry__close { min-height: 44px; border: 0; background: transparent; color: #4d6054; font: inherit; font-size: 0.9rem; text-decoration: underline; text-underline-offset: 0.25em; }

	.auth-entry__main {
		align-self: start;
		padding-top: clamp(72px, 16vh, 136px);
	}

	.auth-entry h1 {
		max-width: 12ch;
		margin: 0;
		font-family: 'DM Sans', sans-serif;
		font-size: clamp(2rem, 9vw, 2.7rem);
		font-weight: 700;
		letter-spacing: -0.05em;
		line-height: 1.06;
		text-wrap: balance;
	}

	.auth-entry__copy { max-width: 30ch; margin: 12px 0 0; color: #65746a; font-size: 1rem; line-height: 1.5; }
	.auth-entry__action { max-width: 390px; margin-top: 32px; color: #24332b; }

	.auth-entry__google {
		display: flex;
		width: 100%;
		min-height: 48px;
		align-items: center;
		justify-content: center;
		gap: 10px;
		border: 1px solid #d6ddd4;
		border-radius: 12px;
		background: #ffffff;
		color: #254634;
		font: inherit;
		font-size: 0.94rem;
		font-weight: 700;
		transition: background-color 180ms ease, transform 180ms ease;
	}

	.auth-entry__google svg { width: 18px; height: 18px; }
	.auth-entry__google:hover:not(:disabled) { background: #edf3eb; }
	.auth-entry__google:active:not(:disabled) { transform: scale(0.98); }
	.auth-entry__google:disabled { color: #718075; }
	.auth-entry__google:focus-visible, .auth-entry__close:focus-visible { outline: 3px solid #e17a50; outline-offset: 3px; }

	.auth-entry__error { margin: 8px 0 0; color: #a63f35; font-size: 0.86rem; line-height: 1.4; }
	.auth-entry__footer { align-self: end; padding-top: 24px; }
	.auth-entry__note { max-width: 40ch; margin: 0; color: #718075; font-size: 0.78rem; line-height: 1.45; }

	@media (min-width: 680px) {
		.auth-entry__content { max-width: 640px; padding-inline: 56px; }
		.auth-entry__main { padding-top: clamp(96px, 18vh, 180px); }
		.auth-entry h1 { font-size: 3rem; }
	}

	@media (prefers-reduced-motion: reduce) { .auth-entry__google { transition: none; } }
</style>
