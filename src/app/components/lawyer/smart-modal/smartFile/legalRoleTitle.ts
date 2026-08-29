export function getLegalRoleTitle(baseRole: string, count: number): string {
    if (!baseRole) return "الطرف";
    const r = baseRole.trim();
    if (count <= 1) return r;

    if (count === 2) { // DUAL (المثنى)
        if (r.includes("مدعى عليه")) return r.replace("عليه", "عليهما");
        if (r.includes("مستأنف عليه")) return r.replace("عليه", "عليهما");
        if (r.includes("معترض عليه")) return r.replace("عليه", "عليهما");
        if (r.includes("مميز عليه")) return r.replace("عليه", "عليهما");
        if (r === "مدعي" || r === "المدعي") return "المدعيان";
        if (r === "مستأنف" || r === "المستأنف") return "المستأنفان";
        if (r === "معترض" || r === "المعترض") return "المعترضان";
        if (r === "مميز" || r === "المميز") return "المميزان";
        if (r.includes("شخص ثالث")) return "شخصان ثالثان";
        if (r.includes("طالب تدخل")) return "طالبا تدخل";
        return r + "ان"; // Default fallback
    }

    if (count >= 3) { // PLURAL (الجمع)
        if (r.includes("مدعى عليه")) return r.replace("عليه", "عليهم");
        if (r.includes("مستأنف عليه")) return r.replace("عليه", "عليهم");
        if (r.includes("معترض عليه")) return r.replace("عليه", "عليهم");
        if (r.includes("مميز عليه")) return r.replace("عليه", "عليهم");
        if (r === "مدعي" || r === "المدعي") return "المدعون";
        if (r === "مستأنف" || r === "المستأنف") return "المستأنفون";
        if (r === "معترض" || r === "المعترض") return "المعترضون";
        if (r === "مميز" || r === "المميز") return "المميزون";
        if (r.includes("شخص ثالث")) return "أشخاص ثالثة";
        if (r.includes("طالب تدخل")) return "طالبو تدخل";
        return r + "ون"; // Default fallback
    }

    return r;
}

