class User:
    def __init__(self, user_id, username):
        self.user_id = user_id
        self.username = username

    def get_user_info(self):
        return {
            "user_id": self.user_id,
            "username": self.username
        }

    def update_username(self, new_username):
        self.username = new_username
        return self.username

    def __str__(self):
        return f"User({self.user_id}, {self.username})"