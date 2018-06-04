import { RichEmbed } from 'discord.js';
import {
	Command,
	CommandDecorators,
	GuildSettings,
	Logger,
	logger,
	Message,
	Middleware
} from 'yamdbf';

import { IMClient } from '../client';
import {
	customInvites,
	CustomInvitesGeneratedReason,
	inviteCodes,
	JoinAttributes,
	JoinInstance,
	joins,
	leaves,
	members,
	sequelize,
	SettingsKey
} from '../sequelize';
import { CommandGroup, createEmbed, showPaginated } from '../utils/util';

const { resolve } = Middleware;
const { using } = CommandDecorators;

const usersPerPage = 20;

export default class extends Command<IMClient> {
	@logger('Command') private readonly _logger: Logger;

	public constructor() {
		super({
			name: 'subtract-leaves',
			aliases: ['subtractleaves', 'subleaves', 'sl'],
			desc: 'Remove leaves from all users',
			usage: '<prefix>subtract-leaves',
			callerPermissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'MANAGE_ROLES'],
			clientPermissions: ['MANAGE_GUILD'],
			group: CommandGroup.Admin,
			guildOnly: true
		});
	}

	public async action(message: Message, [_page]: [number]): Promise<any> {
		this._logger.log(
			`${message.guild.name} (${message.author.username}): ${message.content}`
		);

		const ls = await leaves.findAll({
			attributes: [
				'memberId',
				[
					sequelize.fn(
						'TIMESTAMPDIFF',
						sequelize.literal('SECOND'),
						sequelize.fn('MAX', sequelize.col('join.createdAt')),
						sequelize.fn('MAX', sequelize.col('leave.createdAt'))
					),
					'timeDiff'
				]
			],
			where: {
				guildId: message.guild.id
			},
			group: [
				sequelize.col('leave.memberId'),
				sequelize.col('join->exactMatch.code')
			],
			include: [
				{
					attributes: [],
					model: joins,
					required: true,
					include: [
						{
							attributes: ['code', 'inviterId'],
							model: inviteCodes,
							as: 'exactMatch',
							required: true
						}
					]
				}
			],
			raw: true
		});

		if (ls.length === 0) {
			await message.channel.send(`There have been no leaves so far!`);
			return;
		}

		// Delete old duplicate removals
		await customInvites.destroy({
			where: {
				guildId: message.guild.id,
				generatedReason: CustomInvitesGeneratedReason.leave
			}
		});

		const threshold = await message.guild.storage.settings.get(
			SettingsKey.autoSubtractLeaveThreshold
		);

		// Add subtracts for leaves
		const customInvs = ls
			.filter((l: any) => parseInt(l.timeDiff, 10) < threshold)
			.map((l: any) => ({
				id: null,
				guildId: message.guild.id,
				memberId: l['join.exactMatch.inviterId'],
				creatorId: null,
				amount: -1,
				reason: l.memberId,
				generatedReason: CustomInvitesGeneratedReason.leave
			}));
		await customInvites.bulkCreate(customInvs, {
			updateOnDuplicate: ['amount', 'updatedAt']
		});

		await message.channel.send(`Removed ${customInvs.length} leaves!`);
	}
}
