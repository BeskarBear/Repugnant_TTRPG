/* global Actor, Item, Hooks, CONFIG, game, mergeObject, ChatMessage, Dialog */

class RepugnantActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;
    const attrs = system.attributes || {};
    for (const key of ["muscles", "brains", "vibes"]) {
      const entry = attrs[key] || { magnitude: 0, units: 0 };
      entry.magnitude = Number(entry.magnitude || 0);
      entry.units = Number(entry.units || 0);
      attrs[key] = entry;
    }
    system.attributes = attrs;
  }

  getChitCount(skuz) {
    const entry = this.system?.attributes?.[skuz];
    return Number(entry?.magnitude || 0);
  }
}

class RepugnantItem extends Item {}

class RepugnantActorSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["repugnant", "sheet", "actor"],
      width: 680,
      height: 720,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  get template() {
    return `templates/actor/actor-sheet.html`;
  }

  getData() {
    const data = super.getData();
    const items = data.items ?? [];
    data.itemsByType = items.reduce((acc, item) => {
      acc[item.type] = acc[item.type] || [];
      acc[item.type].push(item);
      return acc;
    }, {});
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".chit-throw").on("click", (ev) => {
      ev.preventDefault();
      RepugnantActorSheet.showChitDialog(this.actor);
    });
  }

  static showChitDialog(actor) {
    const content = `
      <form class="repugnant-chit-dialog">
        <div class="form-group">
          <label>Skuz</label>
          <select name="skuz">
            <option value="muscles">Muscles</option>
            <option value="brains">Brains</option>
            <option value="vibes">Vibes</option>
          </select>
        </div>
        <div class="form-group">
          <label>Throw Type</label>
          <select name="throwType">
            <option value="drop">Drop</option>
            <option value="toss">Toss</option>
            <option value="flick">Flick</option>
          </select>
        </div>
        <div class="form-group">
          <label>Chits Thrown</label>
          <input name="chits" type="number" min="0" value="${actor.getChitCount("muscles")}" />
        </div>
        <div class="form-group">
          <label>Total Points (sum of chit points)</label>
          <input name="points" type="number" min="0" value="0" />
        </div>
        <div class="form-group">
          <label>Target / Difficulty</label>
          <input name="target" type="number" min="0" value="0" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <input name="notes" type="text" />
        </div>
      </form>
    `;

    new Dialog({
      title: "Chit Throw",
      content,
      buttons: {
        roll: {
          icon: "<i class=\"fas fa-hand-sparkles\"></i>",
          label: "Throw",
          callback: (html) => {
            const form = html.find("form")[0];
            const formData = new FormData(form);
            const skuz = formData.get("skuz");
            const throwType = formData.get("throwType");
            const chits = Number(formData.get("chits") || 0);
            const points = Number(formData.get("points") || 0);
            const target = Number(formData.get("target") || 0);
            const notes = formData.get("notes") || "";
            const outcome = target > 0 ? (points >= target ? "Success" : "Fail") : "--";

            const content = `
              <div class="repugnant-chat">
                <h3>${actor.name} - Chit Throw</h3>
                <p><strong>Skuz:</strong> ${skuz}</p>
                <p><strong>Throw:</strong> ${throwType}</p>
                <p><strong>Chits:</strong> ${chits}</p>
                <p><strong>Points:</strong> ${points}</p>
                <p><strong>Target:</strong> ${target || "(manual)"}</p>
                <p><strong>Outcome:</strong> ${outcome}</p>
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
              </div>
            `;
            ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor }),
              content
            });
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "roll"
    }).render(true);
  }
}

class RepugnantItemSheet extends ItemSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["repugnant", "sheet", "item"],
      width: 520,
      height: 420
    });
  }

  get template() {
    return `templates/item/item-sheet.html`;
  }
}

Hooks.once("init", () => {
  console.log("Repugnant | Initializing system");
  CONFIG.Actor.documentClass = RepugnantActor;
  CONFIG.Item.documentClass = RepugnantItem;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("repugnant", RepugnantActorSheet, { makeDefault: true });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("repugnant", RepugnantItemSheet, { makeDefault: true });
});
