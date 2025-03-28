import { AuthService, type AuthTokens } from '$lib/Services/AuthService';
import { UserService, type Account, type Session } from '$lib/Services/UserService';
import { GlobalState } from '$lib/State/GlobalState';
import { error, ok, type Result } from '$lib/Util/interfaces';
import { logger } from '$lib/Util/Logger';
import { get } from 'svelte/store';
import { bolt } from '$lib/State/Bolt';

let saveInProgress: boolean = false;
let savePluginInProgress: boolean = false;

export class BoltService {
	// After refreshing or adding a new account, this function will need to be called.
	// It will initialize or update the Sessions array, and set the config when appropriate
	// Note: Does not call saveCredentials
	static async login(tokens: AuthTokens, session_id: string): Promise<Result<Session, string>> {
		const sessionResult = await UserService.buildSession(tokens, session_id);
		if (!sessionResult.ok) return error(sessionResult.error);
		const newSession = sessionResult.value;
		const sessions = get(GlobalState.sessions);
		const existingSessionIndex = sessions.findIndex(
			(session) => session.user.userId === tokens.sub
		);
		if (existingSessionIndex !== -1) {
			// Update saved session with new session details (i.e. in case character name changes)
			GlobalState.sessions.update((_sessions) => {
				_sessions[existingSessionIndex] = newSession;
				return _sessions;
			});
		} else {
			// Add new session to global list of sessions
			GlobalState.sessions.update((_sessions) => {
				_sessions.push(newSession);
				return _sessions;
			});
			// Update currently selected userid to the new userid
			GlobalState.config.update((_config) => {
				_config.selected.user_id = newSession.user.userId;
				return _config;
			});
		}
		return ok(newSession);
	}

	// After the tokens are older than 30 days, or the user clicks logout, this function will need to be called.
	// It will remove the session from the list of Sessions, and update the saved config
	// Note: Does not call saveCredentials
	static async logout(sub: string): Promise<Session[]> {
		const { sessions, config } = GlobalState;
		sessions.update((s) => {
			const sessionIndex = s.findIndex((session) => session.user.userId === sub);
			if (sessionIndex > -1) {
				AuthService.revokeOauthCreds(s[sessionIndex].tokens.access_token);
				s.splice(sessionIndex, 1);
			}
			return s;
		});
		config.update((c) => {
			if (typeof c.userDetails[sub] !== 'undefined') {
				delete c.userDetails[sub];
			}
			if (c.selected.user_id === sub) c.selected.user_id = null;
			return c;
		});
		return get(sessions);
	}

	// sends an asynchronous POST request containing some JSON and calls the callback with a fetch
	// response object
	static postJSON(
		api: string,
		object: object,
		callback: ((r: Response) => void) | null = null
	): Promise<void> {
		const body: string = JSON.stringify(object);
		const headers = { 'Content-Type': 'application/json' };
		return fetch(api, { method: 'POST', body, headers }).then((response) => {
			if (!response.ok)
				response.text().then((text) => logger.error(`${api} error: ${response.status}: ${text}`));
			if (callback) callback(response);
		});
	}

	// sends an asynchronous request to save the current user config to disk, if it has changed
	static saveConfig(checkForPendingChanges = true) {
		if (saveInProgress) return;
		if (checkForPendingChanges && !GlobalState.configHasPendingChanges) return;
		saveInProgress = true;
		const config = get(GlobalState.config);
		if (config.rs_launch_command === '') config.rs_launch_command = null;
		if (config.osrs_launch_command === '') config.osrs_launch_command = null;
		if (config.runelite_launch_command === '') config.runelite_launch_command = null;
		if (config.hdos_launch_command === '') config.hdos_launch_command = null;
		this.postJSON('/save-config', config, () => (saveInProgress = false));
		return config;
	}

	// sends an asynchronous request to save the current plugin config to disk, if it has changed
	static savePluginConfig(checkForPendingChanges = true) {
		if (savePluginInProgress) return;
		if (checkForPendingChanges && !GlobalState.pluginConfigHasPendingChanges) return;
		savePluginInProgress = true;
		this.postJSON('/save-plugin-config', bolt.pluginConfig, () => (savePluginInProgress = false));
	}

	// sends a request to save all credentials to their config file,
	// overwriting the previous file, if any
	static async saveCredentials(): Promise<void> {
		return this.postJSON('/save-credentials', get(GlobalState.sessions));
	}

	static async openFilePicker(): Promise<string | null> {
		const response = await fetch('/jar-file-picker');
		return response.status === 200 ? response.text() : null;
	}

	static findSession(userId: string | null): Session | undefined {
		const sessions = get(GlobalState.sessions);
		return sessions.find((session) => session.user.userId === userId);
	}

	static findAccount(accounts: Account[], accountId?: string): Account | undefined {
		return accounts.find((account) => account.accountId == accountId);
	}
}
