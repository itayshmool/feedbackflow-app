// frontend/src/types/google-identity.d.ts
// Type definitions for Google Identity Services (GIS)
// https://developers.google.com/identity/oauth2/web/reference/js-reference

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        /** The access token */
        access_token: string;
        /** Token type, always "Bearer" */
        token_type: string;
        /** Seconds until the token expires */
        expires_in: number;
        /** The scopes granted */
        scope: string;
        /** Error code if request failed */
        error?: string;
        /** Error description if request failed */
        error_description?: string;
        /** Error URI if request failed */
        error_uri?: string;
      }

      interface TokenClientConfig {
        /** Your Google API client ID */
        client_id: string;
        /** Space-delimited list of scopes */
        scope: string;
        /** Callback function for token response */
        callback: (response: TokenResponse) => void;
        /** Error callback */
        error_callback?: (error: { type: string; message: string }) => void;
        /** Hint for which account to use */
        hint?: string;
        /** Hosted domain restriction */
        hosted_domain?: string;
        /** State value to pass through */
        state?: string;
        /** Enable granular consent */
        enable_granular_consent?: boolean;
        /** Enable serial consent */
        enable_serial_consent?: boolean;
        /** Login hint (email) */
        login_hint?: string;
        /** Prompt mode */
        prompt?: '' | 'none' | 'consent' | 'select_account';
      }

      interface OverridableTokenClientConfig {
        /** Hint for which account to use */
        hint?: string;
        /** Prompt mode */
        prompt?: '' | 'none' | 'consent' | 'select_account';
        /** Enable granular consent */
        enable_granular_consent?: boolean;
        /** Enable serial consent */
        enable_serial_consent?: boolean;
        /** Login hint (email) */
        login_hint?: string;
        /** State value */
        state?: string;
      }

      interface TokenClient {
        /** Request an access token */
        requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void;
      }

      /** Initialize a token client for requesting access tokens */
      function initTokenClient(config: TokenClientConfig): TokenClient;

      /** Check if a specific scope has been granted */
      function hasGrantedAllScopes(
        tokenResponse: TokenResponse,
        firstScope: string,
        ...restScopes: string[]
      ): boolean;

      /** Check if any of the scopes have been granted */
      function hasGrantedAnyScope(
        tokenResponse: TokenResponse,
        firstScope: string,
        ...restScopes: string[]
      ): boolean;

      /** Revoke the token */
      function revoke(accessToken: string, callback?: () => void): void;
    }

    namespace id {
      interface IdConfiguration {
        /** Your Google API client ID */
        client_id: string;
        /** Callback for credential response */
        callback?: (response: CredentialResponse) => void;
        /** Auto-select credentials */
        auto_select?: boolean;
        /** Login URI for redirect mode */
        login_uri?: string;
        /** Native callback for credential response */
        native_callback?: (response: CredentialResponse) => void;
        /** Cancel on tap outside */
        cancel_on_tap_outside?: boolean;
        /** Prompt parent ID */
        prompt_parent_id?: string;
        /** Nonce for security */
        nonce?: string;
        /** Context hint */
        context?: 'signin' | 'signup' | 'use';
        /** State cookie domain */
        state_cookie_domain?: string;
        /** UX mode */
        ux_mode?: 'popup' | 'redirect';
        /** Allowed parent origin */
        allowed_parent_origin?: string | string[];
        /** Intermediate iframe close callback */
        intermediate_iframe_close_callback?: () => void;
        /** ITp support */
        itp_support?: boolean;
        /** Login hint */
        login_hint?: string;
        /** Hosted domain */
        hd?: string;
        /** Use FedCM for prompts */
        use_fedcm_for_prompt?: boolean;
      }

      interface CredentialResponse {
        /** JWT credential */
        credential: string;
        /** How the credential was selected */
        select_by:
          | 'auto'
          | 'user'
          | 'user_1tap'
          | 'user_2tap'
          | 'btn'
          | 'btn_confirm'
          | 'btn_add_session'
          | 'btn_confirm_add_session';
        /** Client ID */
        clientId?: string;
      }

      /** Initialize Google Identity Services */
      function initialize(config: IdConfiguration): void;

      /** Prompt the One Tap UI */
      function prompt(momentListener?: (notification: PromptMomentNotification) => void): void;

      /** Render a Sign In With Google button */
      function renderButton(
        parent: HTMLElement,
        options: GsiButtonConfiguration
      ): void;

      /** Disable auto-select */
      function disableAutoSelect(): void;

      /** Store credential */
      function storeCredential(
        credential: { id: string; password: string },
        callback?: () => void
      ): void;

      /** Cancel the One Tap prompt */
      function cancel(): void;

      /** Revoke consent */
      function revoke(hint: string, callback?: (response: RevocationResponse) => void): void;

      interface PromptMomentNotification {
        isDisplayMoment: () => boolean;
        isDisplayed: () => boolean;
        isNotDisplayed: () => boolean;
        getNotDisplayedReason: () =>
          | 'browser_not_supported'
          | 'invalid_client'
          | 'missing_client_id'
          | 'opt_out_or_no_session'
          | 'secure_http_required'
          | 'suppressed_by_user'
          | 'unregistered_origin'
          | 'unknown_reason';
        isSkippedMoment: () => boolean;
        getSkippedReason: () =>
          | 'auto_cancel'
          | 'user_cancel'
          | 'tap_outside'
          | 'issuing_failed';
        isDismissedMoment: () => boolean;
        getDismissedReason: () =>
          | 'credential_returned'
          | 'cancel_called'
          | 'flow_restarted';
        getMomentType: () => 'display' | 'skipped' | 'dismissed';
      }

      interface GsiButtonConfiguration {
        type?: 'standard' | 'icon';
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: string | number;
        locale?: string;
        click_listener?: () => void;
        state?: string;
      }

      interface RevocationResponse {
        successful: boolean;
        error?: string;
      }
    }
  }
}

// Make google available globally
declare global {
  interface Window {
    google?: typeof google;
  }
}

export {};

