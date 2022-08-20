export class EvmAddress {
    private _value!: string;

    constructor(value: string) {
        this.value = value;
    }

    get value(): string {
        return this._value;
    }

    set value(value: string) {
        if (!EvmAddress.validate(value)) {
            throw new Error(`Invalid EVM address: ${value}`);
        }
        this._value = value.trim().toLowerCase();
    }

    private static validate(value: string): boolean {
        const regexp = new RegExp('^0x[0-9a-fA-F]{40}$');
        return regexp.test(value);
    }
}

