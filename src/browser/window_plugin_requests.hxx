#ifndef _BOLT_WINDOW_PLUGIN_REQUESTS_HXX
#define _BOLT_WINDOW_PLUGIN_REQUESTS_HXX
#if defined(BOLT_PLUGINS)
#include "../library/ipc.h"
#include "../file_manager.hxx"
#include "include/cef_request_handler.h"

namespace Browser {
	/// Abstract class handling requests from plugin-managed browsers
	struct PluginRequestHandler: public CefRequestHandler {
		PluginRequestHandler(BoltIPCMessageTypeToClient message_type): message_type(message_type) {}

		void HandlePluginMessage(const uint8_t*, size_t);

		CefRefPtr<CefResourceRequestHandler> GetResourceRequestHandler(
			CefRefPtr<CefBrowser>,
			CefRefPtr<CefFrame>,
			CefRefPtr<CefRequest>,
			bool,
			bool,
			const CefString&,
			bool&
		) override;

		virtual uint64_t WindowID() const = 0;
		virtual uint64_t PluginID() const = 0;
		virtual BoltSocketType ClientFD() const = 0;
		virtual CefRefPtr<FileManager::FileManager> FileManager() const = 0;
		virtual CefRefPtr<CefBrowser> Browser() const = 0;
		virtual void HandlePluginCloseRequest() = 0;

		private:
			BoltIPCMessageTypeToClient message_type;
	};
}

#endif
#endif
