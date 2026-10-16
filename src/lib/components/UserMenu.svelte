<script lang="ts">
	import type { User } from 'firebase/auth';
	let { user, onsignout }: { user: User; onsignout: () => void | Promise<void> } = $props();
	let isOpen = $state(false);
	let hasPhotoError = $state(false);
	const initial = $derived(user.displayName?.[0] ?? user.email?.[0] ?? 'U');
</script>

<div class="user-menu">
	<button
		class="avatar"
		onclick={() => (isOpen = !isOpen)}
		aria-expanded={isOpen}
		aria-label="Abrir menú de cuenta"
		>{#if user.photoURL && !hasPhotoError}<img src={user.photoURL} alt="" onerror={() => (hasPhotoError = true)} />{:else}{initial}{/if}</button
	>{#if isOpen}<div class="menu">
			<strong>{user.displayName ?? 'Tu cuenta'}</strong><span>{user.email}</span><button
				onclick={onsignout}>Cerrar sesión</button
			>
		</div>{/if}
</div>

