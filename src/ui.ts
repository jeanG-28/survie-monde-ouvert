import { Inventory, RECIPES } from "./inventory";
import type { ItemId } from "./inventory";

export class UI {
  private woodCountEl = document.getElementById("wood-count")!;
  private stoneCountEl = document.getElementById("stone-count")!;
  private heldItemEl = document.getElementById("held-item")!;
  private promptEl = document.getElementById("prompt")!;
  private buildIndicatorEl = document.getElementById("build-indicator")!;
  private craftMenuEl = document.getElementById("craft-menu")!;
  private recipeListEl = document.getElementById("recipe-list")!;
  private instructionsEl = document.getElementById("instructions")!;
  private loadingStatusEl = document.getElementById("loading-status")!;
  private startHintEl = document.getElementById("start-hint")!;
  private inventory: Inventory;
  private onCraft: (id: ItemId) => void;

  constructor(inventory: Inventory, onCraft: (id: ItemId) => void) {
    this.inventory = inventory;
    this.onCraft = onCraft;
    this.renderRecipes();
    inventory.onChange(() => {
      this.updateResourceCounts();
      this.renderRecipes();
    });
    this.updateResourceCounts();
  }

  private updateResourceCounts() {
    this.woodCountEl.textContent = String(this.inventory.getResource("bois"));
    this.stoneCountEl.textContent = String(this.inventory.getResource("pierre"));
  }

  private renderRecipes() {
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
      button.disabled = !this.inventory.canAfford(recipe.cost);
      button.onclick = () => this.onCraft(recipe.id);
      row.appendChild(button);

      this.recipeListEl.appendChild(row);
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
    this.craftMenuEl.style.display = isOpen ? "none" : "block";
    return !isOpen;
  }

  closeCraftMenu() {
    this.craftMenuEl.style.display = "none";
  }

  isCraftMenuOpen(): boolean {
    return this.craftMenuEl.style.display === "block";
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
