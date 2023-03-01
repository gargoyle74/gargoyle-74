Hooks.on("init", function() {
    Gargoyle74.initialize()
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Gargoyle74.ID);
});

class Gargoyle74 {
    static initialize() {
        Actors.registerSheet("gargoyle-74", Gargoyle74ActorSheet, { types: ["character"], makeDefault: true});

        game.settings.register(this.ID, this.SETTINGS.LOCK_SLOTS, {
            name: `G74.settings.${this.SETTINGS.LOCK_SLOTS}.Name`,
            default: true,
            type: Boolean,
            scope: 'world',
            config: true,
            hint: `G74.settings.${this.SETTINGS.LOCK_SLOTS}.Hint`,
            onChange: () => Gargoyle74.setSlotsAll()
        })
    }

    static ID = 'gargoyle-74';

    static FLAGS = {
        Gargoyle74: 'gargoyle-74'
    }

    static TEMPLATES = {
        Gargoyle74: `./modules/${this.ID}/templates/gargoyle-74-sheet.hbs`,
        PopOut: `./modules/${this.ID}/templates/pop-out.hbs`
    }

    static SETTINGS = {
        LOCK_SLOTS: "lockSlots"
    }

    static log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

        if (shouldLog) {
            console.log(this.ID, '|', ...args);
        }
    }

    static setSlotsAll() {
        game.actors.contents.forEach(actor => {
            this.setSlots(actor)
        });

        ui.players.render()
    }

    static async setSlots(actor) {
        const strength = Number(actor.flags.world.g74.strength)
        const constitution = Number(actor.flags.world.g74.constitution)

        const slots = Math.floor((strength + constitution) / 2)

        await actor.setFlag('world', 'g74.slots', slots)

        for (let key in actor.flags.world.g74.slot) {
            if (! game.settings.get(Gargoyle74.ID, Gargoyle74.SETTINGS.LOCK_SLOTS)) {
                actor.setFlag('world', 'g74.slot.' + key + '.disabled', false)
            } else {
                actor.setFlag('world', 'g74.slot.' + key + '.disabled', (Number(key) > slots))
            }
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
        await Gargoyle74.setSlots(this.actor)

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
                await createPopOut('roll', this.actor, ability)
                break;
            }
            case 'save': {
                await createPopOut('save', this.actor, ability)
                break;
            }
            default: {
                Gargoyle74.log(false, 'Invalid data action detected!')
                break;
            }
        }
    }
}

async function createPopOut(type, actor, ability) {
	const token = actor.token;

	const templateData = {
		actor: actor.data,
		tokenId: token?.uuid || null,
	};

	const content = await renderTemplate(Gargoyle74.TEMPLATES.PopOut, templateData);

	return new Promise(resolve => {
		const data = {
			title: game.i18n.localize("G74.rollModifier"),
			content: content,
			buttons: {
				abilityRoll: {
					label: game.i18n.localize("G74.roll"),
					callback: html => resolve(abilityRoll(type, actor, ability, html))
				},
			},
			default: "abilityRoll",
			close: () => resolve({})
		}

		new Dialog(data, { 'width': 300 }).render(true);;
	});
}

async function abilityRoll(type, actor, ability, html) {
    const form = html[0].querySelector("form");

    const modifier = form.modifier.value

    let rollEquation = "1D20" 
    if (modifier > 0) {
        rollEquation += ' + ' + modifier
    } else if (modifier < 0) {
        rollEquation += ' ' + modifier
    }

	let roll = new Roll(rollEquation, actor.getRollData());

	roll.evaluate().then(function(result) {
        switch(type) {
            case 'roll': {
                const success = roll.total <= actor.flags.world.g74.save

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

                break;
            }
            case 'save': {
                const success = roll.total >= actor.flags.world.g74.save

                let flavor = game.i18n.localize("G74.save")
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

                break;
            }
            default: {
                Gargoyle74.log(false, 'Invalid data action detected!')
                break;
            }
        }
    })
}
