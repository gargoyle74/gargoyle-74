Hooks.on("init", function() {
    Gargoyle74.initialize()
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Gargoyle74.ID);
});

class Gargoyle74 {
    static initialize() {
        Actors.registerSheet("gargoyle-74", Gargoyle74ActorSheet, { types: ["character"], makeDefault: true});
    }

    static ID = 'gargoyle-74';

    static FLAGS = {
        Gargoyle74: 'gargoyle-74'
    }

    static TEMPLATES = {
        Gargoyle74: `./modules/${this.ID}/templates/gargoyle-74-sheet.hbs`
    }

    static SETTINGS = {}

    static log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

        if (shouldLog) {
            console.log(this.ID, '|', ...args);
        }
    }
}

// Ruler.prototype._getSegmentLabel =

class Gargoyle74ActorSheet extends ActorSheet {
    /** @override */
    static get defaultOptions () {
        const path = Gargoyle74.TEMPLATES.Gargoyle74

        return mergeObject(super.defaultOptions, {
            classes: ['sheet', 'actor'],
            template: path,
            width: 600,
            height: 700,
            resizable: true,
            submitOnChange: true,
            resizable: true,
        })
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);

        await this.actor.update(expandedData)

        for (let key in formData) {
            if (key.includes('g74')) {
                this.actor.setFlag('world', key, formData[key])
            }
        }

        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.on('click', "[data-action]", this._handleButtonClick.bind(this));
    }

    async _handleButtonClick(event) {
        const clickedElement = $(event.currentTarget);
        const action = clickedElement.data().action;
        const ability = clickedElement.parents('[data-ability]')?.data()?.ability

        switch(action) {
            case 'play': {
                this.actor.setFlag('world', 'g74.edit', false)
                break;
            }
            case 'edit': {
                this.actor.setFlag('world', 'g74.edit', true)
                break;
            }
            case 'roll': {
                abilityRoll(this.actor, game.i18n.localize("G74.abilityRoll"), game.i18n.localize("G74." + ability))
                break;
            }
            case 'save': {
                abilityRoll(this.actor, game.i18n.localize("G74.savingThrow"), game.i18n.localize("G74." + ability))
                break;
            }
            default: {
                Gargoyle74.log(false, 'Invalid data action detected!')
                break;
            }
        }
    }

}

async function abilityRoll(actor, type, ability, html) {
    let rollEquation = "1D20";

	let roll = new Roll(rollEquation, actor.getRollData());

	roll.evaluate().then(function(result) {		
		result.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: actor }),
			flavor: type + '(' + ability + ')',
			borderColor: 0x00FF00,
	    });
    })
}
