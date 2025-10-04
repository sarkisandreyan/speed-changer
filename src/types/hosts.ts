declare const Brand: unique symbol;

/**
 * A 'normalized' host string, i.e. one that:
 *
 * - (a) is all lowercase
 * - (b) lacks the leading 'www.' unless instructed otherwise
 * - (c) lacks the trailing dot
 *
 * To normalize raw host strings, use the {@link getNormalizedHost} utility.
 */
export type NormalizedHost = string & { [Brand]: true };

export type HostEnabledState = {
  /**
   * Whether the given feature is enabled for the given host.
   */
  enabled: boolean;
  /**
   * Whether the enabled state is exceptional (i.e. is the opposite of
   * the current value of the respective global configuration option).
   */
  exceptional: boolean;
};
