const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 📌 CONFIGURATION DES IDs DE TON SERVEUR
const LOG_CHANNEL_ID = '1561122773240389713'; // Salon de logs pour les demandes de ban
const CATEGORY_TICKET_ID = '1566101884303974581'; // ID de la catégorie "modération"

// 📌 IDs de tes 3 rôles de modération
const ROLE_MODO_PLUS = '1561359192164532334';
const ROLE_MODO = '1561023395171401738';
const ROLE_MODO_TEST = '1561023163100299314git remote add origin https://github.com/akabane974karma-png/bot-discord.git\n' +
    'git branch -M main\n' +
    'git push -u origin main';

client.once('ready', async () => {
    console.log(`Bot MultiGaming connecté sous le nom de ${client.user.tag} !`);

    const contextCommand = new ContextMenuCommandBuilder()
        .setName('Request Ban')
        .setType(ApplicationCommandType.User);

    try {
        await client.application.commands.set([
            contextCommand,
            {
                name: 'setup-ticket',
                description: 'Envoie le panneau de création de tickets'
            }
        ]);
        console.log('Commandes enregistrées avec succès !');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes :', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        // 1. COMMANDE /setup-ticket
        if (interaction.isChatInputCommand() && interaction.commandName === 'setup-ticket') {
            const ticketEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🎫 MultiGaming - Support')
                .setDescription("Avant d'ouvrir un ticket, merci de lire les informations ci-dessous afin d'éviter toute confusion :\n\n⚠️ **Points importants :**\n• Poser une question concernant le serveur\n• Signaler un membre sur le serveur Discord\n• Envoyer vos demandes d'aide ou réclamations\n\nℹ️ **Utilité du ticket**\nMerci de rester courtois et de ne pas mentionner les membres du staff sans raison.");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket')
                    .setLabel('Ouvrir un ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎫')
            );

            await interaction.channel.send({ embeds: [ticketEmbed], components: [row] });
            return interaction.reply({ content: 'Panneau de tickets envoyé avec succès !', ephemeral: true });
        }

        // 2. COMMANDE CONTEXTUELLE "Request Ban"
        if (interaction.isUserContextMenuCommand() && interaction.commandName === 'Request Ban') {
            const targetUser = interaction.targetUser;

            const modal = new ModalBuilder()
                .setCustomId(`ban_modal_${targetUser.id}`)
                .setTitle(`Demande de ban : ${targetUser.username}`);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Raison du bannissement')
                .setPlaceholder('Ex: Pub, arnaques, insultes graves, etc.')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const proofsInput = new TextInputBuilder()
                .setCustomId('proofs')
                .setLabel('Preuves (Liens, captures, etc.)')
                .setPlaceholder('Ex: Lien Gyazo, Discord, capture d\'écran...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(reasonInput),
                new ActionRowBuilder().addComponents(proofsInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // 3. SOUMISSION DE LA MODALE DE BAN
        if (interaction.isModalSubmit() && interaction.customId.startsWith('ban_modal_')) {
            const targetUserId = interaction.customId.split('_')[2];
            const reason = interaction.fields.getTextInputValue('reason');
            const proofs = interaction.fields.getTextInputValue('proofs');
            const moderator = interaction.user;

            await interaction.deferReply({ ephemeral: true });

            const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
            if (!logChannel) {
                return interaction.editReply({ content: '⚠️ Erreur : Le salon de logs est introuvable par le bot.' });
            }

            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🚨 Nouvelle demande de bannissement')
                .addFields(
                    { name: 'Utilisateur visé', value: `<@${targetUserId}> (${targetUserId})`, inline: true },
                    { name: 'Demandeur', value: `${moderator} (${moderator.tag})`, inline: true },
                    { name: 'Raison', value: reason },
                    { name: 'Preuves / Liens', value: proofs }
                )
                .setTimestamp();

            // Ajout des boutons Accepter / Refuser avec l'ID du demandeur intégré
            const banActionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_ban_${targetUserId}_${moderator.id}`)
                    .setLabel('Accepter & Bannir')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId(`refuse_ban_${targetUserId}_${moderator.id}`)
                    .setLabel('Refuser la demande')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✖️')
            );

            await logChannel.send({ embeds: [embed], components: [banActionRow] });
            await interaction.editReply({ content: '✅ Votre demande de bannissement avec les preuves a bien été transmise au staff !' });
            return;
        }

        // 4. GESTION DES BOUTONS (Tickets & Bans)
        if (interaction.isButton()) {
            if (interaction.customId === 'open_ticket') {
                await interaction.deferReply({ ephemeral: true });

                const guild = interaction.guild;
                const member = interaction.member;

                const existingChannel = guild.channels.cache.find(c => c.name === `ticket-${member.user.username.toLowerCase()}`);
                if (existingChannel) {
                    return interaction.editReply({ content: 'Tu possèdes déjà un ticket ouvert !' });
                }

                // Permissions d'accès au salon privé (Créateur + Rôles de modération)
                const overwrites = [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ];

                if (ROLE_MODO_PLUS && ROLE_MODO_PLUS.match(/^\d+$/)) {
                    overwrites.push({ id: ROLE_MODO_PLUS, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                }
                if (ROLE_MODO && ROLE_MODO.match(/^\d+$/)) {
                    overwrites.push({ id: ROLE_MODO, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                }
                if (ROLE_MODO_TEST && ROLE_MODO_TEST.match(/^\d+$/)) {
                    overwrites.push({ id: ROLE_MODO_TEST, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                }

                const ticketChannel = await guild.channels.create({
                    name: `ticket-${member.user.username}`,
                    type: ChannelType.GuildText,
                    parent: CATEGORY_TICKET_ID,
                    permissionOverwrites: overwrites
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle(`Ticket de ${member.user.tag}`)
                    .setDescription("Un membre du staff va rapidement prendre en charge ta demande.");

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                    new ButtonBuilder().setCustomId('claim_ticket').setLabel('Prendre en charge').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
                    new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('Ne plus prendre en charge').setStyle(ButtonStyle.Secondary).setEmoji('↩️')
                );

                await ticketChannel.send({ content: `${member}`, embeds: [ticketEmbed], components: [actionRow] });
                return interaction.editReply({ content: `Ton ticket a été créé avec succès : ${ticketChannel}` });
            }

            // Gestion de l'acceptation du ban et envoi du DM au demandeur
            if (interaction.customId.startsWith('accept_ban_')) {
                await interaction.deferReply({ ephemeral: true });
                const parts = interaction.customId.split('_');
                const targetUserId = parts[2];
                const authorId = parts[3];

                try {
                    await interaction.guild.members.ban(targetUserId, { reason: `Demande acceptée par ${interaction.user.tag}` });

                    // Envoi d'un message privé au demandeur
                    try {
                        const authorUser = await client.users.fetch(authorId);
                        await authorUser.send(`✅ **Votre demande de bannissement a été acceptée !**\nL'administration a validé votre requête concernant l'utilisateur visé.`);
                    } catch (err) {
                        console.log("Impossible d'envoyer le DM au demandeur.");
                    }

                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('accepted').setLabel(`Accepté par ${interaction.user.username}`).setStyle(ButtonStyle.Success).setDisabled(true)
                    );
                    await interaction.message.edit({ components: [disabledRow] });
                    return interaction.editReply({ content: '✅ L\'utilisateur a été banni avec succès et le demandeur a été prévenu en MP.' });
                } catch (err) {
                    console.error("Erreur lors du bannissement :", err);
                    return interaction.editReply({ content: '❌ Erreur : Le bot n\'a pas les permissions pour bannir ce membre (vérifie la position de son rôle).' });
                }
            }

            // Gestion du refus du ban et envoi du DM au demandeur
            if (interaction.customId.startsWith('refuse_ban_')) {
                await interaction.deferReply({ ephemeral: true });
                const parts = interaction.customId.split('_');
                const authorId = parts[3];

                try {
                    const authorUser = await client.users.fetch(authorId);
                    await authorUser.send(`❌ **Votre demande de bannissement a été refusée.**\nL'administration a décidé de rejeter votre requête.`);
                } catch (err) {
                    console.log("Impossible d'envoyer le DM au demandeur.");
                }

                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('refused').setLabel(`Refusé par ${interaction.user.username}`).setStyle(ButtonStyle.Danger).setDisabled(true)
                );
                await interaction.message.edit({ components: [disabledRow] });
                return interaction.editReply({ content: '❌ La demande de bannissement a été refusée et le demandeur a été prévenu en MP.' });
            }

            // Restriction d'accès aux boutons de gestion de tickets pour la modération et l'administration uniquement
            const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
                interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
                [ROLE_MODO_PLUS, ROLE_MODO, ROLE_MODO_TEST].some(roleId => interaction.member.roles.cache.has(roleId));

            if (!isStaff) {
                return interaction.reply({ content: '❌ Seuls les modérateurs et administrateurs peuvent effectuer cette action sur le ticket.', ephemeral: true });
            }

            if (interaction.customId === 'claim_ticket') {
                await interaction.deferReply();
                return interaction.editReply({ content: `✅ Ce ticket a été pris en charge par **${interaction.user.tag}**.` });
            }

            if (interaction.customId === 'unclaim_ticket') {
                await interaction.deferReply();
                return interaction.editReply({ content: `⚠️ **${interaction.user.tag}** a abandonné la prise en charge de ce ticket. Il est de nouveau disponible.` });
            }

            if (interaction.customId === 'close_ticket') {
                await interaction.reply({ content: 'Fermeture du ticket dans 5 secondes...' });
                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (err) {
                        console.error("Impossible de supprimer le salon :", err);
                    }
                }, 5000);
            }
        }
    } catch (error) {
        console.error("Erreur lors d'une interaction :", error);
        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ Une erreur est survenue lors du traitement.', ephemeral: true }).catch(() => {});
        }
    }
});
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot en ligne !');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur HTTP en écoute sur le port ${PORT}`);
});

client.login(process.env.TOKEN);
