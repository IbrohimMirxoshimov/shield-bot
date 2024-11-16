/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Bot, InlineKeyboard, webhookCallback } from 'grammy';

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	kv: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
	BOT_INFO: string;
	BOT_TOKEN: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const bot = new Bot(env.BOT_TOKEN, { botInfo: JSON.parse(env.BOT_INFO) });

		// yengi odam qo'shilsa
		// 1. yozimodigan qib qo'yadi
		// 2. xabar yuboradi mention. + inline button + (5 minut vaqt) (cron)
		// 3. Button bosganda
		// - yozishni ochadi

		// bot.on('msg:text', async (ctx) => {
		// 	const key = String(ctx.from?.id);
		// 	await env.kv.put(key, JSON.stringify({ text: ctx.msg.text }));

		// 	await ctx.reply((await env.kv.get(key)) || '');
		// });

		bot.catch((e) => {
			console.error(e);
		});

		bot.use((ctx, n) => {
			if (ctx.chat && ['group', 'supergroup'].includes(ctx.chat.type)) {
				if (ctx.chat.id !== -1001438438788) {
					return;
				}

				return n();
			}

			if (ctx.chat && ctx.from) {
				return ctx.reply("Men faqat guruhlarda ishlayman. Iltimos meni guruhga admin qilib qo'shing");
			}
		});

		bot.on(':new_chat_members', async (ctx) => {
			await ctx.deleteMessage();

			if (!ctx.from) return;

			await ctx.restrictChatMember(ctx.from.id, {
				can_send_messages: false,
				can_send_audios: false,
				can_send_documents: false,
				can_send_photos: false,
				can_send_videos: false,
				can_send_video_notes: false,
				can_send_voice_notes: false,
				can_send_polls: false,
				can_send_other_messages: false,
			});

			const key = `nr:${ctx.chat.id}:${ctx.from.id}`;

			const msg = await ctx.reply(
				`Assalomu alaykum <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name} ${
					ctx.from.last_name || ''
				}</a>\n\nGuruhga yozish uchun quyidagi tugmani bosing`,
				{
					reply_markup: new InlineKeyboard().text('Men odamman', key),
					parse_mode: 'HTML',
				}
			);

			await env.kv.put(
				key,
				JSON.stringify({
					date: new Date().getTime(),
					message_id: msg.message_id,
				})
			);
		});

		bot.callbackQuery(/nr:(-\d+):(\d+)/, async (ctx) => {
			if (!ctx.from || !ctx.chat) return;

			const [cb_data, _, from_id] = ctx.match;
			const MS_5_MINUTES = 5 * 60 * 1000;

			await ctx.deleteMessage();

			console.log(ctx.callbackQuery.message?.date);

			if (ctx.from.id !== Number(from_id)) {
				return ctx.answerCallbackQuery({
					text: "Bossa bo'larkan deb bosurasizmi?",
					show_alert: true,
				});
			}

			const message_str = await env.kv.get(cb_data);

			await env.kv.delete(cb_data);

			if (!message_str) return;

			const message: {
				date: number;
				message_id: number;
			} = JSON.parse(message_str);

			if (new Date().getTime() - message.date < MS_5_MINUTES) {
				await ctx.promoteChatMember(ctx.from.id, {
					can_post_messages: true,
				});

				return ctx.answerCallbackQuery({
					text: "Bo'ldi yozuring!",
					show_alert: true,
				});
			}
		});

		// await bot.api.deleteWebhook();
		// await bot.start();
		// return new Response();

		return webhookCallback(bot, 'cloudflare-mod')(request);
	},
	// async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
	// 	const doSomeTaskOnASchedule = async () => {
	// 		const list = await env.kv.list({
	// 			prefix: 'nr',
	// 		});

	// 		for (const key of list.keys) {
	// 		}
	// 	};
	// 	ctx.waitUntil(doSomeTaskOnASchedule());
	// },
};
