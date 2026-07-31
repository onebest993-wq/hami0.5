/**
 * React 18 treats `inert={true}` as an unknown boolean DOM attribute and warns.
 * HTML boolean attributes should be present (empty string) or omitted.
 */
export function inertProps(when: boolean): { inert?: '' } {
    return when ? { inert: '' } : {};
}
