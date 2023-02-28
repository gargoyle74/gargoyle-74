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

class Gargoyle74ActorSheet extends ActorSheet {
    /** @override */
    static get defaultOptions () {
        const path = Gargoyle74.TEMPLATES.Gargoyle74

        return mergeObject(super.defaultOptions, {
            classes: ['sheet', 'actor'],
            template: path,
            width: 600,
            height: 700,
            resizable: false,
            submitOnChange: true,
        })
    }

    async _updateObject(event, formData) {
        const expandedData = foundry.utils.expandObject(formData);

        await this.actor.update(expandedData)

        for (let key in formData) {
            if (key.includes('g74')) {
                await this.actor.setFlag('world', key, formData[key])
            }
        }

        // update number of available slots in case 
        // strength or constitution has been updated
        await this.setSlots()

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
                await abilityRoll(this.actor, ability)
                break;
            }
            default: {
                Gargoyle74.log(false, 'Invalid data action detected!')
                break;
            }
        }
    }

    async setSlots() {
        const strength = Number(this.actor.flags.world.g74.strength)
        const constitution = Number(this.actor.flags.world.g74.constitution)

        const slots = Math.floor((strength + constitution) / 2)

        await this.actor.setFlag('world', 'g74.slots', slots)

        for (let key in this.actor.flags.world.g74.slot) {
            this.actor.setFlag('world', 'g74.slot.' + key + '.disabled', (Number(key) > slots))
        }
    }
}

async function abilityRoll(actor, ability, html) {
    let rollEquation = "1D20";

	let roll = new Roll(rollEquation, actor.getRollData());

	roll.evaluate().then(function(result) {	
        const success = roll.total >= actor.flags.world.g74.save

        let flavor = game.i18n.localize("G74." + ability)
        if(success) {
            flavor += " " + game.i18n.localize("G74.success")
        } else {
            flavor += " " + game.i18n.localize("G74.failure")
        }

		result.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: actor }),
			flavor: flavor,
			borderColor: success ? "0x00FF00" : "0xFF0000",
	    });
    })
}
