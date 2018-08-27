import { Guild, Member, Message } from 'eris';

import { IMClient } from '../client';
import { SettingsObject } from '../sequelize';
import { BotCommand, CommandGroup, OwnerCommand } from '../types';

import { Resolver, ResolverConstructor } from '../resolvers/Resolver';

export interface Arg {
	name: string;
	resolver: Resolver | ResolverConstructor;
	required?: boolean;
	description?: string;
}

export interface CommandOptions {
	name: BotCommand | OwnerCommand;
	desc: string;
	aliases: string[];
	args?: Arg[];
	group?: CommandGroup;
	strict?: boolean;
	guildOnly: boolean;
	ownerOnly?: boolean;
	hidden?: boolean;
}

export type TranslateFunc = (
	key: string,
	replacements?: { [key: string]: any }
) => string;

export type Context = {
	guild: Guild;
	me: Member;
	t: TranslateFunc;
	settings: SettingsObject;
};

export abstract class Command {
	public client: IMClient;
	public resolvers: Resolver[];

	public name: BotCommand | OwnerCommand;
	public aliases: string[];
	public args: Arg[];
	public description: string;
	public usage: string;
	public group: CommandGroup;
	public strict?: boolean;
	public guildOnly: boolean;
	public ownerOnly?: boolean;
	public hidden?: boolean;

	public constructor(client: IMClient, props: CommandOptions) {
		this.client = client;
		this.name = props.name;
		this.aliases = props.aliases.map(a => a.toLowerCase());
		this.args = props.args ? props.args : [];
		this.description = props.desc;
		this.group = props.group;
		this.strict = props.strict;
		this.guildOnly = props.guildOnly;
		this.ownerOnly = props.ownerOnly;
		this.hidden = props.hidden;

		this.usage = `<prefix>${this.name} `;

		this.resolvers = [];
		this.args.forEach(arg => {
			if (arg.resolver instanceof Resolver) {
				this.resolvers.push(arg.resolver);
			} else {
				this.resolvers.push(new arg.resolver(this.client));
			}
			delete arg.resolver;

			this.usage += arg.required ? `<${arg.name}> ` : `(<${arg.name}>) `;
		});
	}

	public getInfo(context: Context) {
		let info = '';
		for (let i = 0; i < this.args.length; i++) {
			const help = this.resolvers[i].getHelp(context);
			info +=
				`**<${this.args[i].name}>**:\n` +
				`${this.args[i].description}\n` +
				(help ? `${help}\n\n` : '');
		}
		return info;
	}

	public abstract action(message: Message, args: any[], context: Context): any;
}