export function buildSwitchFrameResult(target: string | number) {
    return {
        success: true,
        message: `The frame exists ("${String(target)}"), but execution context did not switch.`,
        data: {
            frameFound: true,
            switched: false,
            warning: 'Frame exists, but Chrome extension execution context did not switch. Use frame-aware selectors or a future frame routing implementation.'
        }
    };
}
