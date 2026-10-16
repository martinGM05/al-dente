<script lang="ts">
	import { onMount } from 'svelte';
	import { browserLocalPersistence, onAuthStateChanged, setPersistence, signOut, type User } from 'firebase/auth';
	import { doc, onSnapshot, setDoc } from 'firebase/firestore';
	import { auth, db, firebaseConfigured } from '#lib/firebase.js';
	import AuthModal from '#lib/components/AuthModal.svelte';
	import UserMenu from '#lib/components/UserMenu.svelte';

	type Meal = 'Desayuno' | 'Comida' | 'Cena';
	type View = 'plan' | 'recipes' | 'shopping' | 'account';
	type Recipe = { id: string; name: string; emoji: string; time: string; tags: string[]; ingredients: string[]; steps?: string[]; servings?: number; notes?: string };
	type Plan = Record<string, Partial<Record<Meal, Recipe>>>;
	const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
	const meals: Meal[] = ['Desayuno', 'Comida', 'Cena'];
	const initialRecipes: Recipe[] = [
		{ id: 'tacos', name: 'Tacos de frijol', emoji: '🌮', time: '20 min', tags: ['Rápido', 'Vegetariano'], ingredients: ['Tortillas', 'Frijoles', 'Aguacate', 'Queso fresco'], steps: ['Calienta los frijoles con una pizca de sal.', 'Dora las tortillas en un comal.', 'Sirve los frijoles sobre las tortillas y termina con aguacate y queso fresco.'] },
		{ id: 'pasta', name: 'Pasta cremosa', emoji: '🍝', time: '25 min', tags: ['Reconfortante'], ingredients: ['Pasta', 'Crema', 'Espinaca', 'Parmesano'], steps: ['Cuece la pasta hasta que quede al dente.', 'Saltea la espinaca y agrega la crema.', 'Incorpora la pasta, el parmesano y mezcla hasta que la salsa cubra todo.'] },
		{ id: 'bowl', name: 'Bowl mediterráneo', emoji: '🥗', time: '15 min', tags: ['Ligero', 'Vegetariano'], ingredients: ['Garbanzo', 'Pepino', 'Jitomate', 'Limón'], steps: ['Corta el pepino y el jitomate.', 'Mezcla con los garbanzos.', 'Aliña con limón, aceite de oliva y sal.'] },
		{ id: 'salmon', name: 'Salmón al horno', emoji: '🐟', time: '30 min', tags: ['Proteína'], ingredients: ['Salmón', 'Papas', 'Brócoli', 'Limón'], steps: ['Hornea las papas con aceite y sal.', 'Agrega el salmón y el brócoli.', 'Termina con limón cuando el salmón esté cocido.'] },
		{ id: 'toast', name: 'Tostada de aguacate', emoji: '🥑', time: '10 min', tags: ['Rápido'], ingredients: ['Pan integral', 'Aguacate', 'Huevo', 'Chile seco'], steps: ['Tuesta el pan.', 'Machaca el aguacate con sal y limón.', 'Cubre el pan y agrega el huevo y chile seco.'] },
		{ id: 'sopa', name: 'Sopa de lentejas', emoji: '🍲', time: '40 min', tags: ['Para guardar', 'Vegetariano'], ingredients: ['Lentejas', 'Zanahoria', 'Apio', 'Jitomate'], steps: ['Sofríe zanahoria, apio y jitomate.', 'Agrega las lentejas y agua.', 'Cocina hasta que las lentejas estén suaves.'] }
	];
	let recipes = $state<Recipe[]>(initialRecipes);
	let user = $state<User | null>(null);
	let isAuthLoading = $state(firebaseConfigured);
	let plan = $state<Plan>({ Lun: { Desayuno: initialRecipes[4], Comida: initialRecipes[0] }, Mar: { Cena: initialRecipes[1] }, Mié: { Comida: initialRecipes[2] } });
	let selectedDay = $state('Lun'); let activeView = $state<View>('plan');
	let weekOffset = $state(0);
	let isRecipeFormOpen = $state(false);
	let selectedRecipe = $state<Recipe | null>(null);
	let isRecipeDetailDragging = $state(false);
	let recipeDetailOffset = $state(0);
	let detailDragStartY = 0;
	let detailDragLastY = 0;
	let detailDragLastTime = 0;
	let detailDragVelocity = 0;
	let isRecipeSheetClosing = $state(false);
	let isRecipeSheetDragging = $state(false);
	let recipeSheetOffset = $state(0);
	let sheetDragStartY = 0;
	let sheetDragLastY = 0;
	let sheetDragLastTime = 0;
	let sheetDragVelocity = 0;
	let ignoreRecipeSheetHandleClick = $state(false);
	let recipeName = $state('');
	let recipeEmoji = $state('🍽️');
	let recipeTime = $state(30);
	let recipeServings = $state(2);
	let recipeTags = $state('');
	let recipeIngredients = $state('');
	let recipeSteps = $state('');
	let recipeNotes = $state('');
	let recipeFormError = $state('');
	let checkedShoppingItems = $state<Set<string>>(new Set());
	let shoppingView = $state<'pending' | 'done'>('pending');
	let collapsedShoppingGroups = $state<Set<string>>(new Set());
	let hasCustomShoppingSelection = $state(false);
	let selectedShoppingMeals = $state<Set<string>>(new Set());
	let plannedRecipes = $derived(Object.values(plan).flatMap((day) => Object.values(day)).filter(Boolean) as Recipe[]);
	let shoppingMealOptions = $derived.by(() => days.flatMap((day) => meals.flatMap((meal) => {
		const recipe = plan[day]?.[meal];
		return recipe ? [{ id: `${day}-${meal}`, day, meal, recipe }] : [];
	})));
	let selectedShoppingMealOptions = $derived(hasCustomShoppingSelection ? shoppingMealOptions.filter((option) => selectedShoppingMeals.has(option.id)) : shoppingMealOptions);
	let shoppingList = $derived([...new Set(selectedShoppingMealOptions.flatMap((option) => option.recipe.ingredients))]);
	const shoppingCategories = ['Frutas y verduras', 'Proteínas', 'Refrigerados', 'Despensa', 'Otros'];
	function shoppingCategory(item: string) {
		const normalized = item.toLowerCase();
		if (['aguacate', 'pepino', 'jitomate', 'limón', 'espinaca', 'brócoli', 'zanahoria', 'apio'].some((word) => normalized.includes(word))) return 'Frutas y verduras';
		if (['salmón', 'pollo', 'carne', 'pescado'].some((word) => normalized.includes(word))) return 'Proteínas';
		if (['queso', 'crema', 'parmesano', 'huevo', 'leche', 'yogur'].some((word) => normalized.includes(word))) return 'Refrigerados';
		if (['tortillas', 'pasta', 'pan', 'frijoles', 'garbanzo', 'lentejas', 'papas'].some((word) => normalized.includes(word))) return 'Despensa';
		return 'Otros';
	}
	let shoppingGroups = $derived.by(() => shoppingCategories.map((category) => ({ category, items: shoppingList.filter((item) => shoppingCategory(item) === category && (shoppingView === 'done' ? checkedShoppingItems.has(item) : !checkedShoppingItems.has(item))) })).filter((group) => group.items.length));
	let checkedShoppingCount = $derived(shoppingList.filter((item) => checkedShoppingItems.has(item)).length);
	let mealsPlanned = $derived(plannedRecipes.length);
	let weekDates = $derived.by(() => {
		const today = new Date(); const monday = new Date(today);
		monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
		return days.map((label, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return { label, date }; });
	});
	let weekLabel = $derived(new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(weekDates[0].date));

	onMount(() => {
		if (!auth) {
			isAuthLoading = false;
			return;
		}
		// Persistencia explícita: sigue conectado aun después de recargar o reabrir el navegador.
		void setPersistence(auth, browserLocalPersistence);
		const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
			user = nextUser;
			isAuthLoading = false;
			if (!nextUser || !db) return;
			const firestore = db;
			onSnapshot(doc(firestore, 'users', nextUser.uid, 'mealPlans', 'current'), (snapshot) => { const saved = snapshot.data()?.plan as Plan | undefined; if (saved) plan = saved; });
		});
		return unsubscribeAuth;
	});
	async function savePlan(nextPlan: Plan) { plan = nextPlan; if (user && db) await setDoc(doc(db, 'users', user.uid, 'mealPlans', 'current'), { plan: nextPlan, updatedAt: new Date().toISOString() }); }
	function addMeal(recipe: Recipe, meal: Meal = 'Comida') { void savePlan({ ...plan, [selectedDay]: { ...plan[selectedDay], [meal]: recipe } }); activeView = 'plan'; }
	function removeMeal(day: string, meal: Meal) { const { [meal]: _removed, ...remaining } = plan[day] ?? {}; void savePlan({ ...plan, [day]: remaining }); }
	function openRecipeForm() { recipeSheetOffset = 0; isRecipeSheetClosing = false; isRecipeFormOpen = true; }
	function openRecipeDetail(recipe: Recipe) { recipeDetailOffset = 0; isRecipeDetailDragging = false; selectedRecipe = recipe; }
	function closeRecipeDetail() { isRecipeDetailDragging = false; recipeDetailOffset = 0; selectedRecipe = null; }
	function startRecipeDetailDrag(event: PointerEvent) {
		isRecipeDetailDragging = true;
		detailDragStartY = event.clientY; detailDragLastY = event.clientY; detailDragLastTime = performance.now(); detailDragVelocity = 0;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function moveRecipeDetailSheet(event: PointerEvent) {
		if (!isRecipeDetailDragging) return;
		const now = performance.now(); const elapsed = Math.max(now - detailDragLastTime, 1);
		detailDragVelocity = (event.clientY - detailDragLastY) / elapsed;
		detailDragLastY = event.clientY; detailDragLastTime = now;
		const distance = Math.max(0, event.clientY - detailDragStartY);
		recipeDetailOffset = distance > 280 ? 280 + (distance - 280) * .2 : distance;
	}
	function endRecipeDetailDrag() {
		if (!isRecipeDetailDragging) return;
		isRecipeDetailDragging = false;
		if (recipeDetailOffset > 110 || detailDragVelocity > .75) closeRecipeDetail();
		else recipeDetailOffset = 0;
	}
	function handleSheetPointerMove(event: PointerEvent) { moveRecipeSheet(event); moveRecipeDetailSheet(event); }
	function handleSheetPointerEnd() { endRecipeSheetDrag(); endRecipeDetailDrag(); }
	function addSelectedRecipeToPlan() { if (!selectedRecipe) return; addMeal(selectedRecipe); closeRecipeDetail(); }
	function closeRecipeForm() {
		if (isRecipeSheetClosing) return;
		isRecipeSheetDragging = false;
		isRecipeSheetClosing = true;
		recipeSheetOffset = 0;
		setTimeout(() => { isRecipeFormOpen = false; isRecipeSheetClosing = false; }, 240);
	}
	function startRecipeSheetDrag(event: PointerEvent) {
		if (isRecipeSheetClosing) return;
		isRecipeSheetDragging = true;
		ignoreRecipeSheetHandleClick = false;
		sheetDragStartY = event.clientY; sheetDragLastY = event.clientY; sheetDragLastTime = performance.now(); sheetDragVelocity = 0;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function moveRecipeSheet(event: PointerEvent) {
		if (!isRecipeSheetDragging) return;
		const now = performance.now(); const elapsed = Math.max(now - sheetDragLastTime, 1);
		sheetDragVelocity = (event.clientY - sheetDragLastY) / elapsed;
		sheetDragLastY = event.clientY; sheetDragLastTime = now;
		const distance = Math.max(0, event.clientY - sheetDragStartY);
		if (distance > 6) ignoreRecipeSheetHandleClick = true;
		recipeSheetOffset = distance > 280 ? 280 + (distance - 280) * .2 : distance;
	}
	function endRecipeSheetDrag() {
		if (!isRecipeSheetDragging) return;
		isRecipeSheetDragging = false;
		if (recipeSheetOffset > 110 || sheetDragVelocity > .75) closeRecipeForm();
		else recipeSheetOffset = 0;
	}
	function clickRecipeSheetHandle() {
		if (ignoreRecipeSheetHandleClick) { ignoreRecipeSheetHandleClick = false; return; }
		closeRecipeForm();
	}
	function toggleShoppingItem(item: string) {
		const nextItems = new Set(checkedShoppingItems);
		if (nextItems.has(item)) nextItems.delete(item); else nextItems.add(item);
		checkedShoppingItems = nextItems;
	}
	function toggleAllShoppingItems() {
		checkedShoppingItems = checkedShoppingCount === shoppingList.length ? new Set() : new Set(shoppingList);
	}
	function isShoppingMealSelected(id: string) { return !hasCustomShoppingSelection || selectedShoppingMeals.has(id); }
	function toggleShoppingMeal(id: string) {
		const nextMeals = new Set(hasCustomShoppingSelection ? selectedShoppingMeals : shoppingMealOptions.map((option) => option.id));
		if (nextMeals.has(id)) nextMeals.delete(id); else nextMeals.add(id);
		hasCustomShoppingSelection = true;
		selectedShoppingMeals = nextMeals;
	}
	function selectAllShoppingMeals() { hasCustomShoppingSelection = true; selectedShoppingMeals = new Set(shoppingMealOptions.map((option) => option.id)); }
	function toggleShoppingGroup(category: string) {
		const nextGroups = new Set(collapsedShoppingGroups);
		if (nextGroups.has(category)) nextGroups.delete(category); else nextGroups.add(category);
		collapsedShoppingGroups = nextGroups;
	}
	function handleKeydown(event: KeyboardEvent) { if (event.key !== 'Escape') return; if (selectedRecipe) closeRecipeDetail(); else if (isRecipeFormOpen) closeRecipeForm(); }
	function createRecipe() {
		const name = recipeName.trim();
		const ingredients = recipeIngredients.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
		const steps = recipeSteps.split('\n').map((item) => item.trim()).filter(Boolean);
		const tags = recipeTags.split(',').map((item) => item.trim()).filter(Boolean);
		if (!name || !ingredients.length || !steps.length || recipeTime < 1 || recipeServings < 1) {
			recipeFormError = 'Completa nombre, tiempo, porciones, ingredientes y preparación antes de guardar.';
			return;
		}
		recipes = [...recipes, { id: `recipe-${Date.now()}`, name, emoji: recipeEmoji.trim() || '🍽️', time: `${Math.max(1, recipeTime)} min`, tags: tags.length ? tags : ['Mi receta'], ingredients, steps, servings: Math.max(1, recipeServings), notes: recipeNotes.trim() }];
		recipeName = ''; recipeEmoji = '🍽️'; recipeTime = 30; recipeServings = 2; recipeTags = ''; recipeIngredients = ''; recipeSteps = ''; recipeNotes = ''; recipeFormError = ''; closeRecipeForm();
	}
</script>

<svelte:window onkeydown={handleKeydown} onpointermove={handleSheetPointerMove} onpointerup={handleSheetPointerEnd} onpointercancel={handleSheetPointerEnd} />

<svelte:head><title>Al dente — tu semana, resuelta</title><meta name="description" content="Planifica tus comidas y crea una lista de compras en minutos." /></svelte:head>

{#if isAuthLoading}
	<section class="auth-loading" aria-live="polite"><div><span class="auth-loading-brand">al dente<span>•</span></span><p>Comprobando tu sesión…</p></div></section>
{:else if !user}
	<AuthModal required onclose={() => {}} />
{:else}
<main>
	<header><a class="brand" href="/">al dente<span>•</span></a><nav class="desktop-nav" aria-label="Navegación principal"><button class:active={activeView === 'plan'} onclick={() => activeView = 'plan'}>Plan</button><button class:active={activeView === 'recipes'} onclick={() => activeView = 'recipes'}>Recetas</button><button class:active={activeView === 'shopping'} onclick={() => activeView = 'shopping'}>Compras</button><button class:active={activeView === 'account'} onclick={() => activeView = 'account'}>Cuenta</button></nav><UserMenu {user} onsignout={() => auth && signOut(auth)} /></header>
	{#if activeView === 'plan'}
		<section class="week"><div class="week-heading"><div><h2 class="week-title">Semana del {weekLabel}</h2><div class="week-controls"><button onclick={() => weekOffset -= 1} aria-label="Semana anterior">←</button><button onclick={() => weekOffset = 0}>Hoy</button><button onclick={() => weekOffset += 1} aria-label="Semana siguiente">→</button></div></div><button class="outline" onclick={() => { activeView = 'recipes'; openRecipeForm(); }}>+ Nueva receta</button></div><div class="day-tabs">{#each weekDates as day, index}<button class:today={weekOffset === 0 && index === ((new Date().getDay() + 6) % 7)} class:selected={selectedDay === day.label} onclick={() => selectedDay = day.label}><b>{day.label}</b><span>{day.date.getDate()}</span></button>{/each}</div><div class="schedule">{#each meals as meal}{@const recipe = plan[selectedDay]?.[meal]}<div class="meal-row"><div class="meal-name">{meal}</div>{#if recipe}<article class="meal-card"><span class="food">{recipe.emoji}</span><div><b>{recipe.name}</b><small>{recipe.time} · {recipe.tags[0]}</small></div><button class="remove" onclick={() => removeMeal(selectedDay, meal)} aria-label={`Eliminar ${recipe.name}`}>×</button></article>{:else}<button class="empty-meal" onclick={() => activeView = 'recipes'}>+ Elige una receta</button>{/if}</div>{/each}</div></section>
	{:else if activeView === 'recipes'}
		<section class="recipes"><div class="week-heading"><div><h2>Mis recetas</h2><p class="recipe-context">Se añadirá al día <b>{selectedDay}</b>.</p></div><button class="outline" onclick={openRecipeForm}>+ Crear receta</button></div><div class="recipe-grid">{#each recipes as recipe}<article class="recipe"><span>{recipe.emoji}</span><div><h3>{recipe.name}</h3><p>{recipe.time}{recipe.servings ? ` · ${recipe.servings} porciones` : ''} · {recipe.tags.join(' · ')}</p><div class="chips">{#each recipe.ingredients.slice(0, 3) as ingredient}<i>{ingredient}</i>{/each}</div></div><footer class="recipe-actions"><button class="recipe-detail" onclick={() => openRecipeDetail(recipe)}>Ver detalle</button><button onclick={() => addMeal(recipe)}>Añadir</button></footer></article>{/each}</div></section>
	{:else if activeView === 'shopping'}
		<section class="shopping">
			<div class="shopping-heading"><div><h2>Lista de compras</h2><p class="subtitle">Elige las comidas que quieres resolver ahora.</p></div>{#if shoppingList.length}<button class="shopping-all" onclick={toggleAllShoppingItems}>{checkedShoppingCount === shoppingList.length ? 'Reiniciar lista' : 'Marcar todo'}</button>{/if}</div>
			{#if shoppingMealOptions.length}
				<div class="shopping-meal-picker"><div class="shopping-picker-heading"><b>Incluye en esta compra</b><button onclick={selectAllShoppingMeals}>Seleccionar todas</button></div><div class="shopping-meal-options">{#each shoppingMealOptions as option}<button class:active={isShoppingMealSelected(option.id)} aria-pressed={isShoppingMealSelected(option.id)} onclick={() => toggleShoppingMeal(option.id)}><span>{option.day} · {option.meal}</span><b>{option.recipe.name}</b></button>{/each}</div></div>
				{#if shoppingList.length}
					<div class="shopping-progress" role="status"><div><b>{checkedShoppingCount} de {shoppingList.length}</b><span>{checkedShoppingCount === shoppingList.length ? 'Todo listo' : `${shoppingList.length - checkedShoppingCount} por comprar`}</span></div><div class="shopping-progress-track"><i style={`width: ${checkedShoppingCount / shoppingList.length * 100}%`}></i></div></div>
					<div class="shopping-filter" aria-label="Filtrar lista"><button class:active={shoppingView === 'pending'} aria-pressed={shoppingView === 'pending'} onclick={() => shoppingView = 'pending'}>Pendientes <span>{shoppingList.length - checkedShoppingCount}</span></button><button class:active={shoppingView === 'done'} aria-pressed={shoppingView === 'done'} onclick={() => shoppingView = 'done'}>Completados <span>{checkedShoppingCount}</span></button></div>
					{#if shoppingGroups.length}<div class="shopping-groups">{#each shoppingGroups as group}<section class="shopping-group" class:collapsed={collapsedShoppingGroups.has(group.category)}><button class="shopping-group-title" onclick={() => toggleShoppingGroup(group.category)} aria-expanded={!collapsedShoppingGroups.has(group.category)}><h3>{group.category}</h3><span class="shopping-group-meta"><span class="shopping-group-count">{group.items.length}</span><svg class="shopping-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg></span></button>{#if !collapsedShoppingGroups.has(group.category)}<div class="shopping-list">{#each group.items as item}<label class:checked={checkedShoppingItems.has(item)}><input type="checkbox" checked={checkedShoppingItems.has(item)} onchange={() => toggleShoppingItem(item)} /><span>{item}</span></label>{/each}</div>{/if}</section>{/each}</div>{:else}<div class="shopping-empty"><b>{shoppingView === 'done' ? 'Aún no has marcado nada.' : 'Todo está listo para llevar.'}</b><p>{shoppingView === 'done' ? 'Los ingredientes que marques aparecerán aquí.' : 'Puedes reiniciar la lista cuando quieras.'}</p></div>{/if}
				{:else}<div class="shopping-empty"><b>Elige al menos una comida.</b><p>Solo reuniremos los ingredientes de las comidas que selecciones.</p></div>{/if}
			{:else}<div class="shopping-empty"><b>Tu lista aparecerá aquí.</b><p>Añade recetas al plan semanal y reuniremos sus ingredientes por ti.</p></div>{/if}
		</section>
	{:else}
		<section class="account-module"><h2>Tu cuenta</h2><p class="subtitle">Sesión activa como <b>{user.email}</b>. Tus planes se guardan de forma privada.</p><button class="account-action" onclick={() => auth && signOut(auth)}>Cerrar sesión</button></section>
	{/if}
</main>
<nav class="mobile-nav" aria-label="Navegación móvil"><button class:active={activeView === 'plan'} onclick={() => activeView = 'plan'} aria-label="Plan semanal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 2v4m8-4v4M5 9h14" /></svg><span>Plan</span></button><button class:active={activeView === 'recipes'} onclick={() => activeView = 'recipes'} aria-label="Mis recetas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18l-5-3-5 3z" /></svg><span>Recetas</span></button><button class:active={activeView === 'shopping'} onclick={() => activeView = 'shopping'} aria-label="Lista de compras"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14l-1 15H6zM9 5V3h6v2M9 10h6m-6 4h6" /></svg><span>Compras</span></button><button class:active={activeView === 'account'} onclick={() => activeView = 'account'} aria-label="Cuenta"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 21c.7-4 3.1-6 7-6s6.3 2 7 6" /></svg><span>Cuenta</span></button></nav>
{#if isRecipeFormOpen}
	<div class="recipe-sheet-backdrop" class:closing={isRecipeSheetClosing}>
		<dialog class="recipe-sheet" class:dragging={isRecipeSheetDragging} class:closing={isRecipeSheetClosing} style={`--sheet-offset: ${recipeSheetOffset}px`} open aria-modal="true" aria-labelledby="recipe-form-title">
			<button class="sheet-handle" type="button" onpointerdown={startRecipeSheetDrag} onclick={clickRecipeSheetHandle} aria-label="Arrastra hacia abajo para cerrar"></button>
			<div class="sheet-heading"><div><h2 id="recipe-form-title">Nueva receta</h2><p>Guarda los detalles para tenerla lista al planear.</p></div><button class="sheet-close" type="button" onclick={closeRecipeForm} aria-label="Cerrar formulario">×</button></div>
			<form class="recipe-form" oninput={() => (recipeFormError = '')} onsubmit={(event) => { event.preventDefault(); createRecipe(); }}>
				<div class="recipe-form-grid">
					<label class="field-full">Nombre de la receta<input bind:value={recipeName} required placeholder="Ej. Chilaquiles verdes" /></label>
					<label>Emoji<input class="emoji-input" bind:value={recipeEmoji} maxlength="4" aria-label="Emoji de la receta" /></label>
					<label>Tiempo (minutos)<input type="number" bind:value={recipeTime} min="1" required /></label>
					<label>Porciones<input type="number" bind:value={recipeServings} min="1" required /></label>
					<label class="field-full">Etiquetas<input bind:value={recipeTags} placeholder="Ej. Vegetariano, rápido" /><small>Sepáralas con comas.</small></label>
					<label class="field-full">Ingredientes<textarea bind:value={recipeIngredients} required placeholder="Tortillas\nSalsa verde\nHuevo"></textarea><small>Uno por línea o separados con comas.</small></label>
					<label class="field-full">Preparación<textarea bind:value={recipeSteps} required placeholder="Calienta la salsa.\nSirve sobre las tortillas.\nTermina con queso fresco."></textarea><small>Un paso por línea.</small></label>
					<label class="field-full">Notas <span>(opcional)</span><textarea bind:value={recipeNotes} placeholder="Ej. Puedes guardar la salsa hasta tres días."></textarea></label>
				</div>
				{#if recipeFormError}<p class="recipe-form-error" role="alert">{recipeFormError}</p>{/if}
				<div class="recipe-form-actions"><button type="button" class="form-cancel" onclick={closeRecipeForm}>Cancelar</button><button class="form-save">Guardar receta</button></div>
			</form>
		</dialog>
	</div>
{/if}
{#if selectedRecipe}
	<div class="recipe-detail-backdrop">
		<dialog class="recipe-detail-sheet" class:dragging={isRecipeDetailDragging} style={`--detail-sheet-offset: ${recipeDetailOffset}px`} open aria-modal="true" aria-labelledby="recipe-detail-title">
			<button class="recipe-detail-handle" type="button" onpointerdown={startRecipeDetailDrag} aria-label="Arrastra hacia abajo para cerrar"></button>
			<div class="recipe-detail-heading"><header class="recipe-detail-header"><span>{selectedRecipe.emoji}</span><div><h2 id="recipe-detail-title">{selectedRecipe.name}</h2><p>{selectedRecipe.time}{selectedRecipe.servings ? ` · ${selectedRecipe.servings} porciones` : ''}</p></div></header><button class="recipe-detail-close" type="button" onclick={closeRecipeDetail} aria-label="Cerrar detalle">×</button></div>
			<div class="recipe-detail-tags">{#each selectedRecipe.tags as tag}<span>{tag}</span>{/each}</div>
			<section class="recipe-detail-section"><h3>Ingredientes</h3><ul>{#each selectedRecipe.ingredients as ingredient}<li>{ingredient}</li>{/each}</ul></section>
			{#if selectedRecipe.steps?.length}<section class="recipe-detail-section"><h3>Preparación</h3><ol>{#each selectedRecipe.steps as step}<li>{step}</li>{/each}</ol></section>{:else if selectedRecipe.notes}<section class="recipe-detail-section"><h3>Preparación</h3><p>{selectedRecipe.notes}</p></section>{/if}
			{#if selectedRecipe.notes && selectedRecipe.steps?.length}<section class="recipe-detail-section"><h3>Notas</h3><p>{selectedRecipe.notes}</p></section>{/if}
			<button class="recipe-detail-add" onclick={addSelectedRecipeToPlan}>Añadir al plan del {selectedDay}</button>
		</dialog>
	</div>
{/if}
{/if}

