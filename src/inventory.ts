export type ResourceType = "bois" | "pierre";
export type ItemId = "hache" | "epee" | "pioche";

export interface Recipe {
  id: ItemId;
  label: string;
  cost: Partial<Record<ResourceType, number>>;
}

export const RECIPES: Recipe[] = [
  { id: "hache", label: "Hache", cost: { bois: 4, pierre: 2 } },
  { id: "pioche", label: "Pioche", cost: { bois: 4, pierre: 3 } },
  { id: "epee", label: "Épée", cost: { bois: 2, pierre: 4 } },
];

export const BUILD_COSTS = {
  fondation: { bois: 5 },
  mur: { bois: 4 },
} as const;
export type BuildPieceType = keyof typeof BUILD_COSTS;

type Listener = () => void;

export class Inventory {
  private resources: Record<ResourceType, number> = { bois: 0, pierre: 0 };
  private items: Partial<Record<ItemId, number>> = {};
  private listeners: Listener[] = [];

  onChange(fn: Listener) {
    this.listeners.push(fn);
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  addResource(type: ResourceType, amount: number) {
    this.resources[type] += amount;
    this.notify();
  }

  getResource(type: ResourceType): number {
    return this.resources[type];
  }

  canAfford(cost: Partial<Record<ResourceType, number>>): boolean {
    return (Object.entries(cost) as [ResourceType, number][]).every(
      ([type, amount]) => this.resources[type] >= amount,
    );
  }

  private spend(cost: Partial<Record<ResourceType, number>>) {
    for (const [type, amount] of Object.entries(cost) as [ResourceType, number][]) {
      this.resources[type] -= amount;
    }
  }

  craft(recipe: Recipe): boolean {
    if (!this.canAfford(recipe.cost)) return false;
    this.spend(recipe.cost);
    this.items[recipe.id] = (this.items[recipe.id] ?? 0) + 1;
    this.notify();
    return true;
  }

  buildPiece(type: BuildPieceType): boolean {
    const cost = BUILD_COSTS[type];
    if (!this.canAfford(cost)) return false;
    this.spend(cost);
    this.notify();
    return true;
  }

  getItemCount(id: ItemId): number {
    return this.items[id] ?? 0;
  }

  hasItem(id: ItemId): boolean {
    return this.getItemCount(id) > 0;
  }
}
