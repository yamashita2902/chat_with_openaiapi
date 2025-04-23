class ChatThreadsController < ApplicationController
  def index
    @chat_threads = ChatThread.order(created_at: :desc)
    respond_to do |format|
      format.json { render json: { chat_threads: @chat_threads } }
      format.html
    end
  end

  def create
    @chat_thread = ChatThread.create(title: 'Untitled')
    if @chat_thread.persisted?
      render json: { chat_thread: @chat_thread }, status: :created
    else
      render json: { errors: @chat_thread.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def show
    @chat_thread = ChatThread.find(params[:id])
    @message = @chat_thread.messages.build

    respond_to do |format|
      format.json { 
        render json: {
          chat_thread: @chat_thread,
          messages: @chat_thread.messages.order(created_at: :asc)
        }
      }
      format.html { render :index }
    end
  end
end