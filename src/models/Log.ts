import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { Guild } from './Guild';
import { Member } from './Member';

export enum LogAction {
	addInvites = 'addInvites',
	clearInvites = 'clearInvites',
	restoreInvites = 'restoreInvites',
	config = 'config',
	memberConfig = 'memberConfig',
	addRank = 'addRank',
	updateRank = 'updateRank',
	removeRank = 'removeRank',
	owner = 'owner'
}

@Entity({ engine: 'NDBCLUSTER PARTITION BY KEY (guildId)' })
export class Log {
	@Column({ length: 32, primary: true, nullable: false })
	public guildId: string;

	@ManyToOne(type => Guild, g => g.logs, { primary: true, nullable: false })
	public guild: Guild;

	@PrimaryGeneratedColumn()
	public id: number;

	@CreateDateColumn()
	public createdAt: Date;

	@UpdateDateColumn()
	public updatedAt: Date;

	@Column({ type: 'enum', enum: Object.values(LogAction) })
	public action: LogAction;

	@Column({ type: 'text' })
	public message: string;

	@Column({ type: 'json' })
	public data: any;

	@Column({ length: 32, nullable: false })
	public memberId: string;

	@ManyToOne(type => Member, m => m.logs, { nullable: false })
	public member: Member;
}