import { Inventory, RECIPES } from "./inventory";
import type { ItemId, ResourceType } from "./inventory";

const RESOURCE_LABELS: Record<ResourceType, string> = {
  bois: "🪵 Bois",
  pierre: "🪨 Pierre",
  viande: "🥩 Viande",
  fourrure: "🦫 Fourrure",
};

export interface UIOptions {
  onCraft: (id: ItemId) => void;
  onEquip: (id: ItemId) => void;
  canCraftHere: () => boolean;
}

export class UI {
  private woodCountEl = document.getElementById("wood-count")!;
  private stoneCountEl = document.getElementById("stone-count")!;
  private meatCountEl = document.getElementById("meat-count")!;
  private furCountEl = document.getElementById("fur-count")!;
  private heldItemEl = document.getElementById("held-item")!;
  private promptEl = document.getElementById("prompt")!;
  private buildIndicatorEl = document.getElementById("build-indicator")!;
  private craftMenuEl = document.getElementById("craft-menu")!;
  private craftNoticeEl = document.getElementById("craft-notice")!;
  private recipeListEl = document.getElementById("recipe-list")!;
  private inventoryMenuEl = document.getElementById("inventory-menu")!;
  private inventoryResourceListEl = document.getElementById("inventory-resource-list")!;
  private inventoryItemListEl = document.getElementById("inventory-item-list")!;
  private instructionsEl = document.getElementById("instructions")!;
  private loadingStatusEl = document.getElementById("loading-status")!;
  private startHintEl = document.getElementById("start-hint")!;
  private inventory: Inventory;
  private options: UIOptions;

  constructor(inventory: Inventory, options: UIOptions) {
    this.inventory = inventory;
    this.options = options;
    this.renderRecipes();
    inventory.onChange(() => {
      this.updateResourceCounts();
      this.renderRecipes();
      this.renderInventory();
    });
    this.updateResourceCounts();
  }

  private updateResourceCounts() {
    this.woodCountEl.textContent = String(this.inventory.getResource("bois"));
    this.stoneCountEl.textContent = String(this.inventory.getResource("pierre"));
    this.meatCountEl.textContent = String(this.inventory.getResource("viande"));
    this.furCountEl.textContent = String(this.inventory.getResource("fourrure"));
  }

  private renderRecipes() {
    const canCraft = this.options.canCraftHere();
    this.craftNoticeEl.style.display = canCraft ? "none" : "block";

    this.recipeListEl.innerHTML = "";
    for (const recipe of RECIPES) {
      const row = document.createElement("div");
      row.className = "recipe-row";

      const label = document.createElement("div");
      const costText = Object.entries(recipe.cost)
        .map(([type, amount]) => `${amount} ${type}`)
        .join(", ");
      label.innerHTML = `${recipe.label}<div class="recipe-cost">${costText} — possédé: ${this.inventory.getItemCount(recipe.id)}</div>`;
      row.appendChild(label);

      const button = document.createElement("button");
      button.textContent = "Fabriquer";
      button.disabled = !canCraft || !this.inventory.canAfford(recipe.cost);
      button.onclick = () => this.options.onCraft(recipe.id);
      row.appendChild(button);

      this.recipeListEl.appendChild(row);
    }
  }

  private renderInventory() {
    this.inventoryResourceListEl.innerHTML = "";
    for (const type of Object.keys(RESOURCE_LABELS) as ResourceType[]) {
      const row = document.createElement("div");
      row.className = "inv-row";
      row.innerHTML = `<span>${RESOURCE_LABELS[type]}</span><span>${this.inventory.getResource(type)}</span>`;
      this.inventoryResourceListEl.appendChild(row);
    }

    this.inventoryItemListEl.innerHTML = "";
    const owned = RECIPES.filter((r) => this.inventory.getItemCount(r.id) > 0);
    if (owned.length === 0) {
      const empty = document.createElement("p");
      empty.style.color = "#888";
      empty.style.fontSize = "13px";
      empty.textContent = "Aucun objet fabriqué pour l'instant.";
      this.inventoryItemListEl.appendChild(empty);
    }
    for (const recipe of owned) {
      const row = document.createElement("div");
      row.className = "recipe-row";
      const label = document.createElement("div");
      label.innerHTML = `${recipe.label}<div class="recipe-cost">possédé: ${this.inventory.getItemCount(recipe.id)}</div>`;
      row.appendChild(label);
      const button = document.createElement("button");
      button.textContent = "Équiper";
      button.onclick = () => this.options.onEquip(recipe.id);
      row.appendChild(button);
      this.inventoryItemListEl.appendChild(row);
    }
  }

  setHeldItem(label: string) {
    this.heldItemEl.textContent = `✋ ${label}`;
  }

  showPrompt(text: string | null) {
    if (text) {
      this.promptEl.textContent = text;
      this.promptEl.style.display = "block";
    } else {
      this.promptEl.style.display = "none";
    }
  }

  setBuildIndicator(text: string | null) {
    if (text) {
      this.buildIndicatorEl.textContent = text;
      this.buildIndicatorEl.style.display = "block";
    } else {
      this.buildIndicatorEl.style.display = "none";
    }
  }

  toggleCraftMenu(): boolean {
    const isOpen = this.craftMenuEl.style.display === "block";
    if (!isOpen) {
      this.inventoryMenuEl.style.display = "none";
      this.renderRecipes();
    }
    this.craftMenuEl.style.display = isOpen ? "none" : "block";
    return !isOpen;
  }

  closeCraftMenu() {
    this.craftMenuEl.style.display = "none";
  }

  isCraftMenuOpen(): boolean {
    return this.craftMenuEl.style.display === "block";
  }

  toggleInventoryMenu(): boolean {
    const isOpen = this.inventoryMenuEl.style.display === "block";
    if (!isOpen) {
      this.craftMenuEl.style.display = "none";
      this.renderInventory();
    }
    this.inventoryMenuEl.style.display = isOpen ? "none" : "block";
    return !isOpen;
  }

  closeInventoryMenu() {
    this.inventoryMenuEl.style.display = "none";
  }

  isInventoryMenuOpen(): boolean {
    return this.inventoryMenuEl.style.display === "block";
  }

  setLoading(isLoading: boolean) {
    this.loadingStatusEl.style.display = isLoading ? "block" : "none";
    this.startHintEl.style.display = isLoading ? "none" : "block";
  }

  hideInstructions() {
    this.instructionsEl.style.display = "none";
  }

  onStart(fn: () => void) {
    this.instructionsEl.addEventListener("click", () => fn(), { once: true });
  }
}
