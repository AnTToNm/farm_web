module.exports = class UserDto {
    email;
    id;
    name;
    role_name;

    constructor(model) {
        this.email = model.email;
        this.id = model.uid;
        this.name = model.name;
        this.role_name = model.role_name;
    }
}
