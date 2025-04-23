class CreateChatThreads < ActiveRecord::Migration[7.1]
  def change
    create_table :chat_threads do |t|
      t.text :title

      t.timestamps
    end
  end
end
